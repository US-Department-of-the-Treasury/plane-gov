# Python imports
from datetime import timedelta
import json
import pytz

# Django imports
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields import ArrayField
from django.db.models import (
    Case,
    CharField,
    Count,
    Exists,
    F,
    Func,
    OuterRef,
    Prefetch,
    Q,
    UUIDField,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.views.base import BaseAPIView, BaseViewSet
from plane.db.models import (
    Sprint,
    SprintIssue,
    SprintUserProperties,
    Workspace,
    UserFavorite,
    Issue,
    Label,
    User,
    UserRecentVisit,
)
from plane.app.permissions import (
    WorkspaceEntityPermission,
    WorkspaceViewerPermission,
    allow_permission,
    ROLE,
)
from plane.app.serializers import (
    SprintSerializer,
    SprintWriteSerializer,
    SprintUserPropertiesSerializer,
)
from plane.bgtasks.issue_activities_task import issue_activity
from plane.bgtasks.recent_visited_task import recent_visited_task
from plane.bgtasks.webhook_task import model_activity
from plane.utils.host import base_host
from plane.utils.timezone_converter import user_timezone_converter


def get_or_create_sprints_for_workspace(workspace, num_sprints=5):
    """
    Auto-generate sprints for a workspace based on sprint_start_date.

    Creates sprints from Sprint 1 to current sprint + num_sprints future sprints.
    Each sprint is exactly 14 days (2 weeks).

    If sprint_start_date is not set, defaults to the most recent Monday.
    """
    today = timezone.now().date()

    # Auto-set sprint_start_date to most recent Monday if not set
    if not workspace.sprint_start_date:
        # Find most recent Monday (weekday 0 = Monday)
        days_since_monday = today.weekday()
        most_recent_monday = today - timedelta(days=days_since_monday)
        workspace.sprint_start_date = most_recent_monday
        workspace.save(update_fields=['sprint_start_date'])

    sprint_start = workspace.sprint_start_date

    # Calculate which sprint number we're currently in
    days_since_start = (today - sprint_start).days
    if days_since_start < 0:
        # We're before Sprint 1 starts
        current_sprint_number = 0
    else:
        current_sprint_number = (days_since_start // 14) + 1

    # Generate sprints from 1 to current + num_sprints
    max_sprint_number = max(1, current_sprint_number + num_sprints)

    created_sprints = []
    for sprint_num in range(1, max_sprint_number + 1):
        # Calculate sprint dates
        sprint_start_date = sprint_start + timedelta(days=(sprint_num - 1) * 14)

        # Convert to datetime with workspace timezone
        tz = pytz.timezone(workspace.timezone)
        sprint_start_datetime = timezone.make_aware(
            timezone.datetime.combine(sprint_start_date, timezone.datetime.min.time()),
            tz
        )
        sprint_end_datetime = sprint_start_datetime + timedelta(days=13, hours=23, minutes=59, seconds=59)

        # Get or create the sprint
        sprint, created = Sprint.objects.get_or_create(
            workspace=workspace,
            number=sprint_num,
            defaults={
                'name': f'Sprint {sprint_num}',
                'description': '',
                'start_date': sprint_start_datetime,
                'end_date': sprint_end_datetime,
                'timezone': workspace.timezone,
            }
        )

        if created:
            created_sprints.append(sprint)

    return created_sprints


class WorkspaceSprintViewSet(BaseViewSet):
    """
    ViewSet for workspace-wide sprints.

    Sprints are auto-generated based on workspace.sprint_start_date.
    """
    serializer_class = SprintSerializer
    model = Sprint
    permission_classes = [WorkspaceEntityPermission]
    webhook_event = "sprint"

    def get_queryset(self):
        workspace_slug = self.kwargs.get("slug")

        favorite_subquery = UserFavorite.objects.filter(
            user=self.request.user,
            entity_identifier=OuterRef("pk"),
            entity_type="sprint",
            workspace__slug=workspace_slug,
        )

        # Get workspace for timezone
        workspace = Workspace.objects.get(slug=workspace_slug)
        workspace_timezone = workspace.timezone

        # Convert current time to workspace timezone
        local_tz = pytz.timezone(workspace_timezone)
        current_time_in_workspace_tz = timezone.now().astimezone(local_tz)
        current_time_in_utc = current_time_in_workspace_tz.astimezone(pytz.utc)

        return self.filter_queryset(
            super()
            .get_queryset()
            .filter(workspace__slug=workspace_slug)
            .filter(deleted_at__isnull=True)
            .select_related("workspace")
            .prefetch_related(
                Prefetch(
                    "sprint_issues__issue__assignees",
                    queryset=User.objects.only("avatar_asset", "first_name", "id").distinct(),
                )
            )
            .prefetch_related(
                Prefetch(
                    "sprint_issues__issue__labels",
                    queryset=Label.objects.only("name", "color", "id").distinct(),
                )
            )
            .annotate(is_favorite=Exists(favorite_subquery))
            .annotate(
                total_issues=Count(
                    "sprint_issues__issue__id",
                    distinct=True,
                    filter=Q(
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__deleted_at__isnull=True,
                        sprint_issues__issue__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                completed_issues=Count(
                    "sprint_issues__issue__id",
                    distinct=True,
                    filter=Q(
                        sprint_issues__issue__state__group="completed",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__deleted_at__isnull=True,
                        sprint_issues__issue__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "sprint_issues__issue__id",
                    distinct=True,
                    filter=Q(
                        sprint_issues__issue__state__group="cancelled",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__deleted_at__isnull=True,
                        sprint_issues__issue__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                started_issues=Count(
                    "sprint_issues__issue__id",
                    distinct=True,
                    filter=Q(
                        sprint_issues__issue__state__group="started",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__deleted_at__isnull=True,
                        sprint_issues__issue__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "sprint_issues__issue__id",
                    distinct=True,
                    filter=Q(
                        sprint_issues__issue__state__group="unstarted",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__deleted_at__isnull=True,
                        sprint_issues__issue__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                backlog_issues=Count(
                    "sprint_issues__issue__id",
                    distinct=True,
                    filter=Q(
                        sprint_issues__issue__state__group="backlog",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__deleted_at__isnull=True,
                        sprint_issues__issue__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                status=Case(
                    When(
                        Q(start_date__lte=current_time_in_utc) & Q(end_date__gte=current_time_in_utc),
                        then=Value("CURRENT"),
                    ),
                    When(start_date__gt=current_time_in_utc, then=Value("UPCOMING")),
                    When(end_date__lt=current_time_in_utc, then=Value("COMPLETED")),
                    default=Value("DRAFT"),
                    output_field=CharField(),
                )
            )
            .annotate(
                assignee_ids=Coalesce(
                    ArrayAgg(
                        "sprint_issues__issue__assignees__id",
                        distinct=True,
                        filter=~Q(sprint_issues__issue__assignees__id__isnull=True)
                        & Q(sprint_issues__issue__issue_assignee__deleted_at__isnull=True),
                    ),
                    Value([], output_field=ArrayField(UUIDField())),
                )
            )
            .order_by("number")
            .distinct()
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug):
        """List all sprints for the workspace, auto-generating if needed."""
        workspace = Workspace.objects.get(slug=slug)

        # Auto-generate sprints (will auto-set sprint_start_date to most recent Monday if not set)
        get_or_create_sprints_for_workspace(workspace)
        workspace.refresh_from_db()  # Refresh to get updated sprint_start_date

        queryset = self.get_queryset().filter(archived_at__isnull=True)
        sprint_view = request.GET.get("sprint_view", "all")

        workspace_timezone = workspace.timezone
        local_tz = pytz.timezone(workspace_timezone)
        current_time_in_workspace_tz = timezone.now().astimezone(local_tz)
        current_time_in_utc = current_time_in_workspace_tz.astimezone(pytz.utc)

        # Filter by sprint view
        if sprint_view == "current":
            queryset = queryset.filter(
                start_date__lte=current_time_in_utc,
                end_date__gte=current_time_in_utc
            )
        elif sprint_view == "upcoming":
            queryset = queryset.filter(start_date__gt=current_time_in_utc)
        elif sprint_view == "completed":
            queryset = queryset.filter(end_date__lt=current_time_in_utc)

        data = queryset.values(
            "id",
            "workspace_id",
            "number",
            "name",
            "description",
            "start_date",
            "end_date",
            "view_props",
            "sort_order",
            "external_source",
            "external_id",
            "progress_snapshot",
            "logo_props",
            "is_favorite",
            "total_issues",
            "cancelled_issues",
            "completed_issues",
            "started_issues",
            "unstarted_issues",
            "backlog_issues",
            "assignee_ids",
            "status",
            "version",
            "created_by",
        )

        datetime_fields = ["start_date", "end_date"]
        data = user_timezone_converter(data, datetime_fields, workspace_timezone)
        return Response(data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def retrieve(self, request, slug, pk):
        """Retrieve a specific sprint."""
        queryset = self.get_queryset().filter(pk=pk, archived_at__isnull=True)

        data = (
            queryset
            .annotate(
                sub_issues=Issue.issue_objects.filter(
                    parent__isnull=False,
                    issue_sprint__sprint_id=pk,
                    issue_sprint__deleted_at__isnull=True,
                )
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .values(
                "id",
                "workspace_id",
                "number",
                "name",
                "description",
                "start_date",
                "end_date",
                "view_props",
                "sort_order",
                "external_source",
                "external_id",
                "progress_snapshot",
                "sub_issues",
                "logo_props",
                "version",
                "is_favorite",
                "total_issues",
                "completed_issues",
                "cancelled_issues",
                "started_issues",
                "unstarted_issues",
                "backlog_issues",
                "assignee_ids",
                "status",
                "created_by",
            )
            .first()
        )

        if data is None:
            return Response({"error": "Sprint not found"}, status=status.HTTP_404_NOT_FOUND)

        workspace = Workspace.objects.get(slug=slug)
        datetime_fields = ["start_date", "end_date"]
        data = user_timezone_converter(data, datetime_fields, workspace.timezone)

        recent_visited_task.delay(
            slug=slug,
            entity_name="sprint",
            entity_identifier=pk,
            user_id=request.user.id,
            project_id=None,
        )
        return Response(data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def partial_update(self, request, slug, pk):
        """Update a sprint (limited fields - name, description, logo_props, view_props)."""
        queryset = self.get_queryset().filter(workspace__slug=slug, pk=pk)
        sprint = queryset.first()

        if not sprint:
            return Response({"error": "Sprint not found"}, status=status.HTTP_404_NOT_FOUND)

        if sprint.archived_at:
            return Response(
                {"error": "Archived sprint cannot be updated"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_instance = json.dumps(SprintSerializer(sprint).data, cls=DjangoJSONEncoder)

        # Only allow updating certain fields (dates are fixed)
        allowed_fields = ['name', 'description', 'logo_props', 'view_props', 'sort_order']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        serializer = SprintWriteSerializer(sprint, data=update_data, partial=True)
        if serializer.is_valid():
            serializer.save()

            sprint_data = queryset.values(
                "id",
                "workspace_id",
                "number",
                "name",
                "description",
                "start_date",
                "end_date",
                "view_props",
                "sort_order",
                "external_source",
                "external_id",
                "progress_snapshot",
                "logo_props",
                "version",
                "is_favorite",
                "total_issues",
                "completed_issues",
                "cancelled_issues",
                "started_issues",
                "unstarted_issues",
                "backlog_issues",
                "assignee_ids",
                "status",
                "created_by",
            ).first()

            workspace = Workspace.objects.get(slug=slug)
            datetime_fields = ["start_date", "end_date"]
            sprint_data = user_timezone_converter(sprint_data, datetime_fields, workspace.timezone)

            model_activity.delay(
                model_name="sprint",
                model_id=str(sprint_data["id"]),
                requested_data=request.data,
                current_instance=current_instance,
                actor_id=request.user.id,
                slug=slug,
                origin=base_host(request=request, is_app=True),
            )

            return Response(sprint_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkspaceSprintIssuesEndpoint(BaseAPIView):
    """
    Endpoint to add/remove issues from a workspace sprint.
    """
    permission_classes = [WorkspaceEntityPermission]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug, sprint_id):
        """Add issues to a sprint."""
        issues = request.data.get("issues", [])

        if not issues:
            return Response({"error": "Issues are required"}, status=status.HTTP_400_BAD_REQUEST)

        sprint = Sprint.objects.get(workspace__slug=slug, pk=sprint_id)

        if sprint.end_date is not None and sprint.end_date < timezone.now():
            return Response(
                {"error": "Cannot add issues to a completed sprint"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get existing SprintIssues for these issues
        existing_sprint_issues = list(
            SprintIssue.objects.filter(
                ~Q(sprint_id=sprint_id),
                issue_id__in=issues,
                deleted_at__isnull=True,
            )
        )
        existing_issue_ids = [str(si.issue_id) for si in existing_sprint_issues]
        new_issue_ids = list(set(issues) - set(existing_issue_ids))

        # Create new SprintIssue records
        created_records = SprintIssue.objects.bulk_create(
            [
                SprintIssue(
                    workspace_id=sprint.workspace_id,
                    created_by_id=request.user.id,
                    updated_by_id=request.user.id,
                    sprint_id=sprint_id,
                    issue_id=issue_id,
                )
                for issue_id in new_issue_ids
            ],
            batch_size=10,
        )

        # Update existing SprintIssues to new sprint
        updated_records = []
        update_activity = []
        for sprint_issue in existing_sprint_issues:
            old_sprint_id = sprint_issue.sprint_id
            sprint_issue.sprint_id = sprint_id
            updated_records.append(sprint_issue)
            update_activity.append({
                "old_sprint_id": str(old_sprint_id),
                "new_sprint_id": str(sprint_id),
                "issue_id": str(sprint_issue.issue_id),
            })

        SprintIssue.objects.bulk_update(updated_records, ["sprint_id"], batch_size=100)

        issue_activity.delay(
            type="sprint.activity.created",
            requested_data=json.dumps({"sprints_list": issues}),
            actor_id=str(request.user.id),
            issue_id=None,
            project_id=None,
            current_instance=json.dumps({
                "updated_sprint_issues": update_activity,
                "created_sprint_issues": len(created_records),
            }),
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )

        return Response({"message": "success"}, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def delete(self, request, slug, sprint_id, issue_id=None):
        """Remove an issue from a sprint."""
        if not issue_id:
            return Response({"error": "Issue ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        sprint_issue = SprintIssue.objects.filter(
            issue_id=issue_id,
            workspace__slug=slug,
            sprint_id=sprint_id,
            deleted_at__isnull=True,
        )

        if not sprint_issue.exists():
            return Response({"error": "Sprint issue not found"}, status=status.HTTP_404_NOT_FOUND)

        issue_activity.delay(
            type="sprint.activity.deleted",
            requested_data=json.dumps({
                "sprint_id": str(sprint_id),
                "issues": [str(issue_id)],
            }),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=None,
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )

        sprint_issue.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceSprintUserPropertiesEndpoint(BaseAPIView):
    """
    User-specific view preferences for a workspace sprint.
    """
    permission_classes = [WorkspaceEntityPermission]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, sprint_id):
        """Get user properties for a sprint."""
        sprint = Sprint.objects.get(workspace__slug=slug, pk=sprint_id)
        sprint_properties, _ = SprintUserProperties.objects.get_or_create(
            user=request.user,
            sprint=sprint,
            defaults={'workspace': sprint.workspace}
        )
        serializer = SprintUserPropertiesSerializer(sprint_properties)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def patch(self, request, slug, sprint_id):
        """Update user properties for a sprint."""
        sprint = Sprint.objects.get(workspace__slug=slug, pk=sprint_id)
        sprint_properties, _ = SprintUserProperties.objects.get_or_create(
            user=request.user,
            sprint=sprint,
            defaults={'workspace': sprint.workspace}
        )

        sprint_properties.filters = request.data.get("filters", sprint_properties.filters)
        sprint_properties.rich_filters = request.data.get("rich_filters", sprint_properties.rich_filters)
        sprint_properties.display_filters = request.data.get("display_filters", sprint_properties.display_filters)
        sprint_properties.display_properties = request.data.get(
            "display_properties", sprint_properties.display_properties
        )
        sprint_properties.save()

        serializer = SprintUserPropertiesSerializer(sprint_properties)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WorkspaceSprintFavoriteEndpoint(BaseAPIView):
    """
    Endpoint to favorite/unfavorite workspace sprints.
    """
    permission_classes = [WorkspaceEntityPermission]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug, sprint_id):
        """Add sprint to favorites."""
        workspace = Workspace.objects.get(slug=slug)
        UserFavorite.objects.get_or_create(
            workspace=workspace,
            user=request.user,
            entity_type="sprint",
            entity_identifier=sprint_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def delete(self, request, slug, sprint_id):
        """Remove sprint from favorites."""
        UserFavorite.objects.filter(
            entity_type="sprint",
            user=request.user,
            workspace__slug=slug,
            entity_identifier=sprint_id,
        ).delete(soft=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Keep legacy endpoint for backward compatibility
class WorkspaceSprintsEndpoint(BaseAPIView):
    """
    Legacy endpoint for listing workspace sprints.
    Redirects to WorkspaceSprintViewSet.list()
    """
    permission_classes = [WorkspaceViewerPermission]

    def get(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        # Auto-generate sprints if sprint_start_date is set
        if workspace.sprint_start_date:
            get_or_create_sprints_for_workspace(workspace)

        sprints = (
            Sprint.objects.filter(workspace__slug=slug)
            .select_related("workspace")
            .filter(archived_at__isnull=True)
            .filter(deleted_at__isnull=True)
            .annotate(
                total_issues=Count(
                    "sprint_issues",
                    filter=Q(
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__deleted_at__isnull=True,
                        sprint_issues__issue__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                completed_issues=Count(
                    "sprint_issues__issue__state__group",
                    filter=Q(
                        sprint_issues__issue__state__group="completed",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__issue__deleted_at__isnull=True,
                        sprint_issues__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "sprint_issues__issue__state__group",
                    filter=Q(
                        sprint_issues__issue__state__group="cancelled",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__issue__deleted_at__isnull=True,
                        sprint_issues__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                started_issues=Count(
                    "sprint_issues__issue__state__group",
                    filter=Q(
                        sprint_issues__issue__state__group="started",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__issue__deleted_at__isnull=True,
                        sprint_issues__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "sprint_issues__issue__state__group",
                    filter=Q(
                        sprint_issues__issue__state__group="unstarted",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__issue__deleted_at__isnull=True,
                        sprint_issues__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                backlog_issues=Count(
                    "sprint_issues__issue__state__group",
                    filter=Q(
                        sprint_issues__issue__state__group="backlog",
                        sprint_issues__issue__archived_at__isnull=True,
                        sprint_issues__issue__is_draft=False,
                        sprint_issues__issue__deleted_at__isnull=True,
                        sprint_issues__deleted_at__isnull=True,
                    ),
                )
            )
            .order_by("number")
            .distinct()
        )
        serializer = SprintSerializer(sprints, many=True).data
        return Response(serializer, status=status.HTTP_200_OK)

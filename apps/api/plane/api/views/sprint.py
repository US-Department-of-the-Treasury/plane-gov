# Python imports
import json

# Django imports
from django.core import serializers
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import (
    Count,
    F,
    Func,
    OuterRef,
    Q,
    Sum,
)

# Third party imports
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiRequest, OpenApiResponse

# Module imports
from plane.api.serializers import (
    SprintIssueSerializer,
    SprintSerializer,
    SprintIssueRequestSerializer,
    TransferSprintIssueRequestSerializer,
    SprintCreateSerializer,
    SprintUpdateSerializer,
    IssueSerializer,
)
from plane.app.permissions import ProjectEntityPermission
from plane.bgtasks.issue_activities_task import issue_activity
from plane.db.models import (
    Sprint,
    SprintIssue,
    Issue,
    Project,
    FileAsset,
    IssueLink,
    ProjectMember,
    UserFavorite,
)
from plane.utils.sprint_transfer_issues import transfer_sprint_issues
from plane.utils.host import base_host
from .base import BaseAPIView
from plane.bgtasks.webhook_task import model_activity
from plane.utils.openapi.decorators import sprint_docs
from plane.utils.openapi import (
    CURSOR_PARAMETER,
    PER_PAGE_PARAMETER,
    SPRINT_VIEW_PARAMETER,
    ORDER_BY_PARAMETER,
    FIELDS_PARAMETER,
    EXPAND_PARAMETER,
    create_paginated_response,
    # Request Examples
    SPRINT_CREATE_EXAMPLE,
    SPRINT_UPDATE_EXAMPLE,
    SPRINT_ISSUE_REQUEST_EXAMPLE,
    TRANSFER_SPRINT_ISSUE_EXAMPLE,
    # Response Examples
    SPRINT_EXAMPLE,
    SPRINT_ISSUE_EXAMPLE,
    TRANSFER_SPRINT_ISSUE_SUCCESS_EXAMPLE,
    TRANSFER_SPRINT_ISSUE_ERROR_EXAMPLE,
    TRANSFER_SPRINT_COMPLETED_ERROR_EXAMPLE,
    DELETED_RESPONSE,
    ARCHIVED_RESPONSE,
    SPRINT_CANNOT_ARCHIVE_RESPONSE,
    UNARCHIVED_RESPONSE,
    REQUIRED_FIELDS_RESPONSE,
)


class SprintListCreateAPIEndpoint(BaseAPIView):
    """Sprint List and Create Endpoint"""

    serializer_class = SprintSerializer
    model = Sprint
    webhook_event = "sprint"
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            Sprint.objects.filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .select_related("project")
            .select_related("workspace")
            .select_related("owned_by")
            .annotate(
                total_issues=Count(
                    "issue_sprint",
                    filter=Q(
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                completed_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="completed",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="cancelled",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                started_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="started",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="unstarted",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                backlog_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="backlog",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @sprint_docs(
        operation_id="list_sprints",
        summary="List sprints",
        description="Retrieve all sprints in a project. Supports filtering by sprint status like current, upcoming, completed, or draft.",  # noqa: E501
        parameters=[
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            SPRINT_VIEW_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                SprintSerializer,
                "PaginatedSprintResponse",
                "Paginated list of sprints",
                "Paginated Sprints",
            ),
        },
    )
    def get(self, request, slug, project_id):
        """List sprints

        Retrieve all sprints in a project.
        Supports filtering by sprint status like current, upcoming, completed, or draft.
        """
        project = Project.objects.get(workspace__slug=slug, pk=project_id)
        queryset = self.get_queryset().filter(archived_at__isnull=True)
        sprint_view = request.GET.get("sprint_view", "all")

        # Current Sprint
        if sprint_view == "current":
            queryset = queryset.filter(start_date__lte=timezone.now(), end_date__gte=timezone.now())
            data = SprintSerializer(
                queryset,
                many=True,
                fields=self.fields,
                expand=self.expand,
                context={"project": project},
            ).data
            return Response(data, status=status.HTTP_200_OK)

        # Upcoming Sprints
        if sprint_view == "upcoming":
            queryset = queryset.filter(start_date__gt=timezone.now())
            return self.paginate(
                request=request,
                queryset=(queryset),
                on_results=lambda sprints: SprintSerializer(
                    sprints,
                    many=True,
                    fields=self.fields,
                    expand=self.expand,
                    context={"project": project},
                ).data,
            )

        # Completed Sprints
        if sprint_view == "completed":
            queryset = queryset.filter(end_date__lt=timezone.now())
            return self.paginate(
                request=request,
                queryset=(queryset),
                on_results=lambda sprints: SprintSerializer(
                    sprints,
                    many=True,
                    fields=self.fields,
                    expand=self.expand,
                    context={"project": project},
                ).data,
            )

        # Draft Sprints
        if sprint_view == "draft":
            queryset = queryset.filter(end_date=None, start_date=None)
            return self.paginate(
                request=request,
                queryset=(queryset),
                on_results=lambda sprints: SprintSerializer(
                    sprints,
                    many=True,
                    fields=self.fields,
                    expand=self.expand,
                    context={"project": project},
                ).data,
            )

        # Incomplete Sprints
        if sprint_view == "incomplete":
            queryset = queryset.filter(Q(end_date__gte=timezone.now()) | Q(end_date__isnull=True))
            return self.paginate(
                request=request,
                queryset=(queryset),
                on_results=lambda sprints: SprintSerializer(
                    sprints,
                    many=True,
                    fields=self.fields,
                    expand=self.expand,
                    context={"project": project},
                ).data,
            )
        return self.paginate(
            request=request,
            queryset=(queryset),
            on_results=lambda sprints: SprintSerializer(
                sprints,
                many=True,
                fields=self.fields,
                expand=self.expand,
                context={"project": project},
            ).data,
        )

    @sprint_docs(
        operation_id="create_sprint",
        summary="Create sprint",
        description="Create a new development sprint with specified name, description, and date range. Supports external ID tracking for integration purposes.",  # noqa: E501
        request=OpenApiRequest(
            request=SprintCreateSerializer,
            examples=[SPRINT_CREATE_EXAMPLE],
        ),
        responses={
            201: OpenApiResponse(
                description="Sprint created",
                response=SprintSerializer,
                examples=[SPRINT_EXAMPLE],
            ),
        },
    )
    def post(self, request, slug, project_id):
        """Create sprint

        Create a new development sprint with specified name, description, and date range.
        Supports external ID tracking for integration purposes.
        """
        if (request.data.get("start_date", None) is None and request.data.get("end_date", None) is None) or (
            request.data.get("start_date", None) is not None and request.data.get("end_date", None) is not None
        ):
            serializer = SprintCreateSerializer(data=request.data, context={"request": request})
            if serializer.is_valid():
                if (
                    request.data.get("external_id")
                    and request.data.get("external_source")
                    and Sprint.objects.filter(
                        project_id=project_id,
                        workspace__slug=slug,
                        external_source=request.data.get("external_source"),
                        external_id=request.data.get("external_id"),
                    ).exists()
                ):
                    sprint = Sprint.objects.filter(
                        workspace__slug=slug,
                        project_id=project_id,
                        external_source=request.data.get("external_source"),
                        external_id=request.data.get("external_id"),
                    ).first()
                    return Response(
                        {
                            "error": "Sprint with the same external id and external source already exists",
                            "id": str(sprint.id),
                        },
                        status=status.HTTP_409_CONFLICT,
                    )
                serializer.save(project_id=project_id)
                # Send the model activity
                model_activity.delay(
                    model_name="sprint",
                    model_id=str(serializer.instance.id),
                    requested_data=request.data,
                    current_instance=None,
                    actor_id=request.user.id,
                    slug=slug,
                    origin=base_host(request=request, is_app=True),
                )

                sprint = Sprint.objects.get(pk=serializer.instance.id)
                serializer = SprintSerializer(sprint)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(
                {"error": "Both start date and end date are either required or are to be null"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class SprintDetailAPIEndpoint(BaseAPIView):
    """
    This viewset automatically provides `retrieve`, `update` and `destroy` actions related to sprint.
    """

    serializer_class = SprintSerializer
    model = Sprint
    webhook_event = "sprint"
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            Sprint.objects.filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .select_related("project")
            .select_related("workspace")
            .select_related("owned_by")
            .annotate(
                total_issues=Count(
                    "issue_sprint",
                    filter=Q(
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                completed_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="completed",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="cancelled",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                started_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="started",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="unstarted",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                backlog_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="backlog",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @sprint_docs(
        operation_id="retrieve_sprint",
        summary="Retrieve sprint",
        description="Retrieve details of a specific sprint by its ID. Supports sprint status filtering.",
        responses={
            200: OpenApiResponse(
                description="Sprints",
                response=SprintSerializer,
                examples=[SPRINT_EXAMPLE],
            ),
        },
    )
    def get(self, request, slug, project_id, pk):
        """List or retrieve sprints

        Retrieve all sprints in a project or get details of a specific sprint.
        Supports filtering by sprint status like current, upcoming, completed, or draft.
        """
        project = Project.objects.get(workspace__slug=slug, pk=project_id)
        queryset = self.get_queryset().filter(archived_at__isnull=True).get(pk=pk)
        data = SprintSerializer(
            queryset,
            fields=self.fields,
            expand=self.expand,
            context={"project": project},
        ).data
        return Response(data, status=status.HTTP_200_OK)

    @sprint_docs(
        operation_id="update_sprint",
        summary="Update sprint",
        description="Modify an existing sprint's properties like name, description, or date range. Completed sprints can only have their sort order changed.",  # noqa: E501
        request=OpenApiRequest(
            request=SprintUpdateSerializer,
            examples=[SPRINT_UPDATE_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Sprint updated",
                response=SprintSerializer,
                examples=[SPRINT_EXAMPLE],
            ),
        },
    )
    def patch(self, request, slug, project_id, pk):
        """Update sprint

        Modify an existing sprint's properties like name, description, or date range.
        Completed sprints can only have their sort order changed.
        """
        sprint = Sprint.objects.get(workspace__slug=slug, project_id=project_id, pk=pk)

        current_instance = json.dumps(SprintSerializer(sprint).data, cls=DjangoJSONEncoder)

        if sprint.archived_at:
            return Response(
                {"error": "Archived sprint cannot be edited"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request_data = request.data

        if sprint.end_date is not None and sprint.end_date < timezone.now():
            if "sort_order" in request_data:
                # Can only change sort order
                request_data = {"sort_order": request_data.get("sort_order", sprint.sort_order)}
            else:
                return Response(
                    {"error": "The Sprint has already been completed so it cannot be edited"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = SprintUpdateSerializer(sprint, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            if (
                request.data.get("external_id")
                and (sprint.external_id != request.data.get("external_id"))
                and Sprint.objects.filter(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_source=request.data.get("external_source", sprint.external_source),
                    external_id=request.data.get("external_id"),
                ).exists()
            ):
                return Response(
                    {
                        "error": "Sprint with the same external id and external source already exists",
                        "id": str(sprint.id),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            serializer.save()

            # Send the model activity
            model_activity.delay(
                model_name="sprint",
                model_id=str(serializer.instance.id),
                requested_data=request.data,
                current_instance=current_instance,
                actor_id=request.user.id,
                slug=slug,
                origin=base_host(request=request, is_app=True),
            )
            sprint = Sprint.objects.get(pk=serializer.instance.id)
            serializer = SprintSerializer(sprint)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @sprint_docs(
        operation_id="delete_sprint",
        summary="Delete sprint",
        description="Permanently remove a sprint and all its associated issue relationships",
        responses={
            204: DELETED_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, pk):
        """Delete sprint

        Permanently remove a sprint and all its associated issue relationships.
        Only admins or the sprint creator can perform this action.
        """
        sprint = Sprint.objects.get(workspace__slug=slug, project_id=project_id, pk=pk)
        if sprint.owned_by_id != request.user.id and (
            not ProjectMember.objects.filter(
                workspace__slug=slug,
                member=request.user,
                role=20,
                project_id=project_id,
                is_active=True,
            ).exists()
        ):
            return Response(
                {"error": "Only admin or creator can delete the sprint"},
                status=status.HTTP_403_FORBIDDEN,
            )

        sprint_issues = list(SprintIssue.objects.filter(sprint_id=self.kwargs.get("pk")).values_list("issue", flat=True))

        issue_activity.delay(
            type="sprint.activity.deleted",
            requested_data=json.dumps(
                {
                    "sprint_id": str(pk),
                    "sprint_name": str(sprint.name),
                    "issues": [str(issue_id) for issue_id in sprint_issues],
                }
            ),
            actor_id=str(request.user.id),
            issue_id=None,
            project_id=str(project_id),
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
        )
        # Delete the sprint
        sprint.delete()
        # Delete the user favorite sprint
        UserFavorite.objects.filter(entity_type="sprint", entity_identifier=pk, project_id=project_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintArchiveUnarchiveAPIEndpoint(BaseAPIView):
    """Sprint Archive and Unarchive Endpoint"""

    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            Sprint.objects.filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(archived_at__isnull=False)
            .select_related("project")
            .select_related("workspace")
            .select_related("owned_by")
            .annotate(
                total_issues=Count(
                    "issue_sprint",
                    filter=Q(
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                completed_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="completed",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="cancelled",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                started_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="started",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="unstarted",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                backlog_issues=Count(
                    "issue_sprint__issue__state__group",
                    filter=Q(
                        issue_sprint__issue__state__group="backlog",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(total_estimates=Sum("issue_sprint__issue__estimate_point__key"))
            .annotate(
                completed_estimates=Sum(
                    "issue_sprint__issue__estimate_point__key",
                    filter=Q(
                        issue_sprint__issue__state__group="completed",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .annotate(
                started_estimates=Sum(
                    "issue_sprint__issue__estimate_point__key",
                    filter=Q(
                        issue_sprint__issue__state__group="started",
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @sprint_docs(
        operation_id="list_archived_sprints",
        description="Retrieve all sprints that have been archived in the project.",
        summary="List archived sprints",
        parameters=[CURSOR_PARAMETER, PER_PAGE_PARAMETER],
        request={},
        responses={
            200: create_paginated_response(
                SprintSerializer,
                "PaginatedArchivedSprintResponse",
                "Paginated list of archived sprints",
                "Paginated Archived Sprints",
            ),
        },
    )
    def get(self, request, slug, project_id):
        """List archived sprints

        Retrieve all sprints that have been archived in the project.
        Returns paginated results with sprint statistics and completion data.
        """
        return self.paginate(
            request=request,
            queryset=(self.get_queryset()),
            on_results=lambda sprints: SprintSerializer(sprints, many=True, fields=self.fields, expand=self.expand).data,
        )

    @sprint_docs(
        operation_id="archive_sprint",
        summary="Archive sprint",
        description="Move a completed sprint to archived status for historical tracking. Only sprints that have ended can be archived.",  # noqa: E501
        request={},
        responses={
            204: ARCHIVED_RESPONSE,
            400: SPRINT_CANNOT_ARCHIVE_RESPONSE,
        },
    )
    def post(self, request, slug, project_id, sprint_id):
        """Archive sprint

        Move a completed sprint to archived status for historical tracking.
        Only sprints that have ended can be archived.
        """
        sprint = Sprint.objects.get(pk=sprint_id, project_id=project_id, workspace__slug=slug)
        if sprint.end_date >= timezone.now():
            return Response(
                {"error": "Only completed sprints can be archived"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sprint.archived_at = timezone.now()
        sprint.save()
        UserFavorite.objects.filter(
            entity_type="sprint",
            entity_identifier=sprint_id,
            project_id=project_id,
            workspace__slug=slug,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @sprint_docs(
        operation_id="unarchive_sprint",
        summary="Unarchive sprint",
        description="Restore an archived sprint to active status, making it available for regular use.",
        request={},
        responses={
            204: UNARCHIVED_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, sprint_id):
        """Unarchive sprint

        Restore an archived sprint to active status, making it available for regular use.
        The sprint will reappear in active sprint lists.
        """
        sprint = Sprint.objects.get(pk=sprint_id, project_id=project_id, workspace__slug=slug)
        sprint.archived_at = None
        sprint.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintIssueListCreateAPIEndpoint(BaseAPIView):
    """Sprint Issue List and Create Endpoint"""

    serializer_class = SprintIssueSerializer
    model = SprintIssue
    webhook_event = "sprint_issue"
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            SprintIssue.objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("issue_id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(sprint_id=self.kwargs.get("sprint_id"))
            .select_related("project")
            .select_related("workspace")
            .select_related("sprint")
            .select_related("issue", "issue__state", "issue__project")
            .prefetch_related("issue__assignees", "issue__labels")
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @sprint_docs(
        operation_id="list_sprint_work_items",
        summary="List sprint work items",
        description="Retrieve all work items assigned to a sprint.",
        parameters=[CURSOR_PARAMETER, PER_PAGE_PARAMETER],
        request={},
        responses={
            200: create_paginated_response(
                IssueSerializer,
                "PaginatedSprintIssueResponse",
                "Paginated list of sprint work items",
                "Paginated Sprint Work Items",
            ),
        },
    )
    def get(self, request, slug, project_id, sprint_id):
        """List or retrieve sprint work items

        Retrieve all work items assigned to a sprint or get details of a specific sprint work item.
        Returns paginated results with work item details, assignees, and labels.
        """
        # List
        order_by = request.GET.get("order_by", "created_at")
        issues = (
            Issue.issue_objects.filter(issue_sprint__sprint_id=sprint_id, issue_sprint__deleted_at__isnull=True)
            .annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(bridge_id=F("issue_sprint__id"))
            .filter(project_id=project_id)
            .filter(workspace__slug=slug)
            .select_related("project")
            .select_related("workspace")
            .select_related("state")
            .select_related("parent")
            .prefetch_related("assignees")
            .prefetch_related("labels")
            .order_by(order_by)
            .annotate(
                link_count=IssueLink.objects.filter(issue=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(
                attachment_count=FileAsset.objects.filter(
                    issue_id=OuterRef("id"),
                    entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
                )
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
        )

        return self.paginate(
            request=request,
            queryset=(issues),
            on_results=lambda issues: IssueSerializer(issues, many=True, fields=self.fields, expand=self.expand).data,
        )

    @sprint_docs(
        operation_id="add_sprint_work_items",
        summary="Add Work Items to Sprint",
        description="Assign multiple work items to a sprint. Automatically handles bulk creation and updates with activity tracking.",  # noqa: E501
        request=OpenApiRequest(
            request=SprintIssueRequestSerializer,
            examples=[SPRINT_ISSUE_REQUEST_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Sprint work items added",
                response=SprintIssueSerializer,
                examples=[SPRINT_ISSUE_EXAMPLE],
            ),
            400: REQUIRED_FIELDS_RESPONSE,
        },
    )
    def post(self, request, slug, project_id, sprint_id):
        """Add sprint issues

        Assign multiple work items to a sprint or move them from another sprint.
        Automatically handles bulk creation and updates with activity tracking.
        """
        issues = request.data.get("issues", [])

        if not issues:
            return Response(
                {"error": "Work items are required", "code": "MISSING_WORK_ITEMS"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sprint = Sprint.objects.get(workspace__slug=slug, project_id=project_id, pk=sprint_id)

        if sprint.end_date is not None and sprint.end_date < timezone.now():
            return Response(
                {
                    "code": "SPRINT_COMPLETED",
                    "message": "The Sprint has already been completed so no new issues can be added",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get all SprintWorkItems already created
        sprint_issues = list(SprintIssue.objects.filter(~Q(sprint_id=sprint_id), issue_id__in=issues))
        existing_issues = [
            str(sprint_issue.issue_id) for sprint_issue in sprint_issues if str(sprint_issue.issue_id) in issues
        ]
        new_issues = list(set(issues) - set(existing_issues))

        # New issues to create
        created_records = SprintIssue.objects.bulk_create(
            [
                SprintIssue(
                    project_id=project_id,
                    workspace_id=sprint.workspace_id,
                    sprint_id=sprint_id,
                    issue_id=issue,
                )
                for issue in new_issues
            ],
            ignore_conflicts=True,
            batch_size=10,
        )

        # Updated Issues
        updated_records = []
        update_sprint_issue_activity = []
        # Iterate over each sprint_issue in sprint_issues
        for sprint_issue in sprint_issues:
            old_sprint_id = sprint_issue.sprint_id
            # Update the sprint_issue's sprint_id
            sprint_issue.sprint_id = sprint_id
            # Add the modified sprint_issue to the records_to_update list
            updated_records.append(sprint_issue)
            # Record the update activity
            update_sprint_issue_activity.append(
                {
                    "old_sprint_id": str(old_sprint_id),
                    "new_sprint_id": str(sprint_id),
                    "issue_id": str(sprint_issue.issue_id),
                }
            )

        # Update the sprint issues
        SprintIssue.objects.bulk_update(updated_records, ["sprint_id"], batch_size=100)

        # Capture Issue Activity
        issue_activity.delay(
            type="sprint.activity.created",
            requested_data=json.dumps({"sprints_list": issues}),
            actor_id=str(self.request.user.id),
            issue_id=None,
            project_id=str(self.kwargs.get("project_id", None)),
            current_instance=json.dumps(
                {
                    "updated_sprint_issues": update_sprint_issue_activity,
                    "created_sprint_issues": serializers.serialize("json", created_records),
                }
            ),
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )
        # Return all Sprint Issues
        return Response(
            SprintIssueSerializer(self.get_queryset(), many=True).data,
            status=status.HTTP_200_OK,
        )


class SprintIssueDetailAPIEndpoint(BaseAPIView):
    """
    This viewset automatically provides `list`, `create`,
    and `destroy` actions related to sprint issues.

    """

    serializer_class = SprintIssueSerializer
    model = SprintIssue
    webhook_event = "sprint_issue"
    bulk = True
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            SprintIssue.objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("issue_id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(sprint_id=self.kwargs.get("sprint_id"))
            .select_related("project")
            .select_related("workspace")
            .select_related("sprint")
            .select_related("issue", "issue__state", "issue__project")
            .prefetch_related("issue__assignees", "issue__labels")
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @sprint_docs(
        operation_id="retrieve_sprint_work_item",
        summary="Retrieve sprint work item",
        description="Retrieve details of a specific sprint work item.",
        responses={
            200: OpenApiResponse(
                description="Sprint work items",
                response=SprintIssueSerializer,
                examples=[SPRINT_ISSUE_EXAMPLE],
            ),
        },
    )
    def get(self, request, slug, project_id, sprint_id, issue_id):
        """Retrieve sprint work item

        Retrieve details of a specific sprint work item.
        Returns paginated results with work item details, assignees, and labels.
        """
        sprint_issue = SprintIssue.objects.get(
            workspace__slug=slug,
            project_id=project_id,
            sprint_id=sprint_id,
            issue_id=issue_id,
        )
        serializer = SprintIssueSerializer(sprint_issue, fields=self.fields, expand=self.expand)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @sprint_docs(
        operation_id="delete_sprint_work_item",
        summary="Delete sprint work item",
        description="Remove a work item from a sprint while keeping the work item in the project.",
        responses={
            204: DELETED_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, sprint_id, issue_id):
        """Remove sprint work item

        Remove a work item from a sprint while keeping the work item in the project.
        Records the removal activity for tracking purposes.
        """
        sprint_issue = SprintIssue.objects.get(
            issue_id=issue_id,
            workspace__slug=slug,
            project_id=project_id,
            sprint_id=sprint_id,
        )
        issue_id = sprint_issue.issue_id
        sprint_issue.delete()
        issue_activity.delay(
            type="sprint.activity.deleted",
            requested_data=json.dumps(
                {
                    "sprint_id": str(self.kwargs.get("sprint_id")),
                    "issues": [str(issue_id)],
                }
            ),
            actor_id=str(self.request.user.id),
            issue_id=str(issue_id),
            project_id=str(self.kwargs.get("project_id", None)),
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TransferSprintIssueAPIEndpoint(BaseAPIView):
    """
    This viewset provides `create` actions for transferring the issues into a particular sprint.

    """

    permission_classes = [ProjectEntityPermission]

    @sprint_docs(
        operation_id="transfer_sprint_work_items",
        summary="Transfer sprint work items",
        description="Move incomplete work items from the current sprint to a new target sprint. Captures progress snapshot and transfers only unfinished work items.",  # noqa: E501
        request=OpenApiRequest(
            request=TransferSprintIssueRequestSerializer,
            examples=[TRANSFER_SPRINT_ISSUE_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Work items transferred successfully",
                response={
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Success message",
                            "example": "Success",
                        },
                    },
                },
                examples=[TRANSFER_SPRINT_ISSUE_SUCCESS_EXAMPLE],
            ),
            400: OpenApiResponse(
                description="Bad request",
                response={
                    "type": "object",
                    "properties": {
                        "error": {
                            "type": "string",
                            "description": "Error message",
                            "example": "New Sprint Id is required",
                        },
                    },
                },
                examples=[
                    TRANSFER_SPRINT_ISSUE_ERROR_EXAMPLE,
                    TRANSFER_SPRINT_COMPLETED_ERROR_EXAMPLE,
                ],
            ),
        },
    )
    def post(self, request, slug, project_id, sprint_id):
        """Transfer sprint issues

        Move incomplete issues from the current sprint to a new target sprint.
        Captures progress snapshot and transfers only unfinished work items.
        """
        new_sprint_id = request.data.get("new_sprint_id", False)

        if not new_sprint_id:
            return Response(
                {"error": "New Sprint Id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_sprint = Sprint.objects.get(
            workspace__slug=slug,
            project_id=project_id,
            pk=sprint_id,
        )
        # transfer work items only when sprint is completed (passed the end data)
        if old_sprint.end_date is not None and old_sprint.end_date > timezone.now():
            return Response(
                {"error": "The old sprint is not completed yet"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Call the utility function to handle the transfer
        result = transfer_sprint_issues(
            slug=slug,
            project_id=project_id,
            sprint_id=sprint_id,
            new_sprint_id=new_sprint_id,
            request=request,
            user_id=self.request.user.id,
        )

        # Handle the result
        if result.get("success"):
            return Response({"message": "Success"}, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": result.get("error")},
                status=status.HTTP_400_BAD_REQUEST,
            )

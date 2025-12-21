# Python imports
import json

# Django imports
from django.core import serializers
from django.db.models import Count, F, Func, OuterRef, Prefetch, Q
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder

# Third party imports
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiResponse, OpenApiRequest

# Package imports
from plane.api.serializers import (
    IssueSerializer,
    EpicIssueSerializer,
    EpicSerializer,
    EpicIssueRequestSerializer,
    EpicCreateSerializer,
    EpicUpdateSerializer,
)
from plane.app.permissions import ProjectEntityPermission
from plane.bgtasks.issue_activities_task import issue_activity
from plane.db.models import (
    Issue,
    FileAsset,
    IssueLink,
    Epic,
    EpicIssue,
    EpicLink,
    Project,
    ProjectMember,
    UserFavorite,
)

from .base import BaseAPIView
from plane.bgtasks.webhook_task import model_activity
from plane.utils.host import base_host
from plane.utils.openapi import (
    epic_docs,
    epic_issue_docs,
    EPIC_ID_PARAMETER,
    EPIC_PK_PARAMETER,
    ISSUE_ID_PARAMETER,
    CURSOR_PARAMETER,
    PER_PAGE_PARAMETER,
    ORDER_BY_PARAMETER,
    FIELDS_PARAMETER,
    EXPAND_PARAMETER,
    create_paginated_response,
    # Request Examples
    EPIC_CREATE_EXAMPLE,
    EPIC_UPDATE_EXAMPLE,
    EPIC_ISSUE_REQUEST_EXAMPLE,
    # Response Examples
    EPIC_EXAMPLE,
    EPIC_ISSUE_EXAMPLE,
    INVALID_REQUEST_RESPONSE,
    PROJECT_NOT_FOUND_RESPONSE,
    EXTERNAL_ID_EXISTS_RESPONSE,
    EPIC_NOT_FOUND_RESPONSE,
    DELETED_RESPONSE,
    ADMIN_ONLY_RESPONSE,
    REQUIRED_FIELDS_RESPONSE,
    EPIC_ISSUE_NOT_FOUND_RESPONSE,
    CANNOT_ARCHIVE_RESPONSE,
)


class EpicListCreateAPIEndpoint(BaseAPIView):
    """Epic List and Create Endpoint"""

    serializer_class = EpicSerializer
    model = Epic
    webhook_event = "epic"
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            Epic.objects.filter(project_id=self.kwargs.get("project_id"))
            .filter(workspace__slug=self.kwargs.get("slug"))
            .select_related("project")
            .select_related("workspace")
            .select_related("lead")
            .prefetch_related("members")
            .prefetch_related(
                Prefetch(
                    "link_epic",
                    queryset=EpicLink.objects.select_related("epic", "created_by"),
                )
            )
            .annotate(
                total_issues=Count(
                    "issue_epic",
                    filter=Q(
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                completed_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="completed",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="cancelled",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                started_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="started",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="unstarted",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                backlog_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="backlog",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
        )

    @epic_docs(
        operation_id="create_epic",
        summary="Create epic",
        description="Create a new project epic with specified name, description, and timeline.",
        request=OpenApiRequest(
            request=EpicCreateSerializer,
            examples=[EPIC_CREATE_EXAMPLE],
        ),
        responses={
            201: OpenApiResponse(
                description="Epic created",
                response=EpicSerializer,
                examples=[EPIC_EXAMPLE],
            ),
            400: INVALID_REQUEST_RESPONSE,
            404: PROJECT_NOT_FOUND_RESPONSE,
            409: EXTERNAL_ID_EXISTS_RESPONSE,
        },
    )
    def post(self, request, slug, project_id):
        """Create epic

        Create a new project epic with specified name, description, and timeline.
        Automatically assigns the creator as epic lead and tracks activity.
        """
        project = Project.objects.get(pk=project_id, workspace__slug=slug)
        serializer = EpicCreateSerializer(
            data=request.data,
            context={"project_id": project_id, "workspace_id": project.workspace_id},
        )
        if serializer.is_valid():
            if (
                request.data.get("external_id")
                and request.data.get("external_source")
                and Epic.objects.filter(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_source=request.data.get("external_source"),
                    external_id=request.data.get("external_id"),
                ).exists()
            ):
                epic = Epic.objects.filter(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_source=request.data.get("external_source"),
                    external_id=request.data.get("external_id"),
                ).first()
                return Response(
                    {
                        "error": "Epic with the same external id and external source already exists",
                        "id": str(epic.id),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            serializer.save()
            # Send the model activity
            model_activity.delay(
                model_name="epic",
                model_id=str(serializer.instance.id),
                requested_data=request.data,
                current_instance=None,
                actor_id=request.user.id,
                slug=slug,
                origin=base_host(request=request, is_app=True),
            )
            epic = Epic.objects.get(pk=serializer.instance.id)
            serializer = EpicSerializer(epic)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @epic_docs(
        operation_id="list_epics",
        summary="List epics",
        description="Retrieve all epics in a project.",
        parameters=[
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                EpicSerializer,
                "PaginatedEpicResponse",
                "Paginated list of epics",
                "Paginated Epics",
            ),
            404: OpenApiResponse(description="Epic not found"),
        },
    )
    def get(self, request, slug, project_id):
        """List or retrieve epics

        Retrieve all epics in a project or get details of a specific epic.
        Returns paginated results with epic statistics and member information.
        """
        return self.paginate(
            request=request,
            queryset=(self.get_queryset().filter(archived_at__isnull=True)),
            on_results=lambda epics: EpicSerializer(
                epics, many=True, fields=self.fields, expand=self.expand
            ).data,
        )


class EpicDetailAPIEndpoint(BaseAPIView):
    """Epic Detail Endpoint"""

    model = Epic
    permission_classes = [ProjectEntityPermission]
    serializer_class = EpicSerializer
    webhook_event = "epic"
    use_read_replica = True

    def get_queryset(self):
        return (
            Epic.objects.filter(project_id=self.kwargs.get("project_id"))
            .filter(workspace__slug=self.kwargs.get("slug"))
            .select_related("project")
            .select_related("workspace")
            .select_related("lead")
            .prefetch_related("members")
            .prefetch_related(
                Prefetch(
                    "link_epic",
                    queryset=EpicLink.objects.select_related("epic", "created_by"),
                )
            )
            .annotate(
                total_issues=Count(
                    "issue_epic",
                    filter=Q(
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                completed_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="completed",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="cancelled",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                started_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="started",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="unstarted",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                backlog_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="backlog",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
        )

    @epic_docs(
        operation_id="update_epic",
        summary="Update epic",
        description="Modify an existing epic's properties like name, description, status, or timeline.",
        parameters=[
            EPIC_PK_PARAMETER,
        ],
        request=OpenApiRequest(
            request=EpicUpdateSerializer,
            examples=[EPIC_UPDATE_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Epic updated successfully",
                response=EpicSerializer,
                examples=[EPIC_EXAMPLE],
            ),
            400: OpenApiResponse(
                description="Invalid request data",
                response=EpicSerializer,
                examples=[EPIC_UPDATE_EXAMPLE],
            ),
            404: OpenApiResponse(description="Epic not found"),
            409: OpenApiResponse(description="Epic with same external ID already exists"),
        },
    )
    def patch(self, request, slug, project_id, pk):
        """Update epic

        Modify an existing epic's properties like name, description, status, or timeline.
        Tracks all changes in model activity logs for audit purposes.
        """
        epic = Epic.objects.get(pk=pk, project_id=project_id, workspace__slug=slug)

        current_instance = json.dumps(EpicSerializer(epic).data, cls=DjangoJSONEncoder)

        if epic.archived_at:
            return Response(
                {"error": "Archived epic cannot be edited"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EpicSerializer(epic, data=request.data, context={"project_id": project_id}, partial=True)
        if serializer.is_valid():
            if (
                request.data.get("external_id")
                and (epic.external_id != request.data.get("external_id"))
                and Epic.objects.filter(
                    project_id=project_id,
                    workspace__slug=slug,
                    external_source=request.data.get("external_source", epic.external_source),
                    external_id=request.data.get("external_id"),
                ).exists()
            ):
                return Response(
                    {
                        "error": "Epic with the same external id and external source already exists",
                        "id": str(epic.id),
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            serializer.save()

            # Send the model activity
            model_activity.delay(
                model_name="epic",
                model_id=str(serializer.instance.id),
                requested_data=request.data,
                current_instance=current_instance,
                actor_id=request.user.id,
                slug=slug,
                origin=base_host(request=request, is_app=True),
            )

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @epic_docs(
        operation_id="retrieve_epic",
        summary="Retrieve epic",
        description="Retrieve details of a specific epic.",
        parameters=[
            EPIC_PK_PARAMETER,
        ],
        responses={
            200: OpenApiResponse(
                description="Epic",
                response=EpicSerializer,
                examples=[EPIC_EXAMPLE],
            ),
            404: OpenApiResponse(description="Epic not found"),
        },
    )
    def get(self, request, slug, project_id, pk):
        """Retrieve epic

        Retrieve details of a specific epic.
        """
        queryset = self.get_queryset().filter(archived_at__isnull=True).get(pk=pk)
        data = EpicSerializer(queryset, fields=self.fields, expand=self.expand).data
        return Response(data, status=status.HTTP_200_OK)

    @epic_docs(
        operation_id="delete_epic",
        summary="Delete epic",
        description="Permanently remove a epic and all its associated issue relationships.",
        parameters=[
            EPIC_PK_PARAMETER,
        ],
        responses={
            204: DELETED_RESPONSE,
            403: ADMIN_ONLY_RESPONSE,
            404: EPIC_NOT_FOUND_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, pk):
        """Delete epic

        Permanently remove a epic and all its associated issue relationships.
        Only admins or the epic creator can perform this action.
        """
        epic = Epic.objects.get(workspace__slug=slug, project_id=project_id, pk=pk)
        if epic.created_by_id != request.user.id and (
            not ProjectMember.objects.filter(
                workspace__slug=slug,
                member=request.user,
                role=20,
                project_id=project_id,
                is_active=True,
            ).exists()
        ):
            return Response(
                {"error": "Only admin or creator can delete the epic"},
                status=status.HTTP_403_FORBIDDEN,
            )

        epic_issues = list(EpicIssue.objects.filter(epic_id=pk).values_list("issue", flat=True))
        issue_activity.delay(
            type="epic.activity.deleted",
            requested_data=json.dumps(
                {
                    "epic_id": str(pk),
                    "epic_name": str(epic.name),
                    "issues": [str(issue_id) for issue_id in epic_issues],
                }
            ),
            actor_id=str(request.user.id),
            issue_id=None,
            project_id=str(project_id),
            current_instance=json.dumps({"epic_name": str(epic.name)}),
            epoch=int(timezone.now().timestamp()),
            origin=base_host(request=request, is_app=True),
        )
        epic.delete()
        # Delete the epic issues
        EpicIssue.objects.filter(epic=pk, project_id=project_id).delete()
        # Delete the user favorite epic
        UserFavorite.objects.filter(entity_type="epic", entity_identifier=pk, project_id=project_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EpicIssueListCreateAPIEndpoint(BaseAPIView):
    """Epic Work Item List and Create Endpoint"""

    serializer_class = EpicIssueSerializer
    model = EpicIssue
    webhook_event = "epic_issue"
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            EpicIssue.objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("issue"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(epic_id=self.kwargs.get("epic_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .select_related("project")
            .select_related("workspace")
            .select_related("epic")
            .select_related("issue", "issue__state", "issue__project")
            .prefetch_related("issue__assignees", "issue__labels")
            .prefetch_related("epic__members")
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @epic_issue_docs(
        operation_id="list_epic_work_items",
        summary="List epic work items",
        description="Retrieve all work items assigned to a epic with detailed information.",
        parameters=[
            EPIC_ID_PARAMETER,
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        request={},
        responses={
            200: create_paginated_response(
                IssueSerializer,
                "PaginatedEpicIssueResponse",
                "Paginated list of epic work items",
                "Paginated Epic Work Items",
            ),
            404: OpenApiResponse(description="Epic not found"),
        },
    )
    def get(self, request, slug, project_id, epic_id):
        """List epic work items

        Retrieve all work items assigned to a epic with detailed information.
        Returns paginated results including assignees, labels, and attachments.
        """
        order_by = request.GET.get("order_by", "created_at")
        issues = (
            Issue.issue_objects.filter(issue_epic__epic_id=epic_id, issue_epic__deleted_at__isnull=True)
            .annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(bridge_id=F("issue_epic__id"))
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

    @epic_issue_docs(
        operation_id="add_epic_work_items",
        summary="Add Work Items to Epic",
        description="Assign multiple work items to a epic or move them from another epic. Automatically handles bulk creation and updates with activity tracking.",  # noqa: E501
        parameters=[
            EPIC_ID_PARAMETER,
        ],
        request=OpenApiRequest(
            request=EpicIssueRequestSerializer,
            examples=[EPIC_ISSUE_REQUEST_EXAMPLE],
        ),
        responses={
            200: OpenApiResponse(
                description="Epic issues added",
                response=EpicIssueSerializer,
                examples=[EPIC_ISSUE_EXAMPLE],
            ),
            400: REQUIRED_FIELDS_RESPONSE,
            404: EPIC_NOT_FOUND_RESPONSE,
        },
    )
    def post(self, request, slug, project_id, epic_id):
        """Add epic work items

        Assign multiple work items to a epic or move them from another epic.
        Automatically handles bulk creation and updates with activity tracking.
        """
        issues = request.data.get("issues", [])
        if not len(issues):
            return Response({"error": "Issues are required"}, status=status.HTTP_400_BAD_REQUEST)
        epic = Epic.objects.get(workspace__slug=slug, project_id=project_id, pk=epic_id)

        issues = Issue.objects.filter(workspace__slug=slug, project_id=project_id, pk__in=issues).values_list(
            "id", flat=True
        )

        epic_issues = list(EpicIssue.objects.filter(issue_id__in=issues))

        update_epic_issue_activity = []
        records_to_update = []
        record_to_create = []

        for issue in issues:
            epic_issue = [epic_issue for epic_issue in epic_issues if str(epic_issue.issue_id) in issues]

            if len(epic_issue):
                if epic_issue[0].epic_id != epic_id:
                    update_epic_issue_activity.append(
                        {
                            "old_epic_id": str(epic_issue[0].epic_id),
                            "new_epic_id": str(epic_id),
                            "issue_id": str(epic_issue[0].issue_id),
                        }
                    )
                    epic_issue[0].epic_id = epic_id
                    records_to_update.append(epic_issue[0])
            else:
                record_to_create.append(
                    EpicIssue(
                        epic=epic,
                        issue_id=issue,
                        project_id=project_id,
                        workspace=epic.workspace,
                        created_by=request.user,
                        updated_by=request.user,
                    )
                )

        EpicIssue.objects.bulk_create(record_to_create, batch_size=10, ignore_conflicts=True)

        EpicIssue.objects.bulk_update(records_to_update, ["epic"], batch_size=10)

        # Capture Issue Activity
        issue_activity.delay(
            type="epic.activity.created",
            requested_data=json.dumps({"epics_list": str(issues)}),
            actor_id=str(self.request.user.id),
            issue_id=None,
            project_id=str(self.kwargs.get("project_id", None)),
            current_instance=json.dumps(
                {
                    "updated_epic_issues": update_epic_issue_activity,
                    "created_epic_issues": serializers.serialize("json", record_to_create),
                }
            ),
            epoch=int(timezone.now().timestamp()),
            origin=base_host(request=request, is_app=True),
        )

        return Response(
            EpicIssueSerializer(self.get_queryset(), many=True).data,
            status=status.HTTP_200_OK,
        )


class EpicIssueDetailAPIEndpoint(BaseAPIView):
    """
    This viewset automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions related to epic work items.

    """

    serializer_class = EpicIssueSerializer
    model = EpicIssue
    webhook_event = "epic_issue"
    bulk = True
    use_read_replica = True

    permission_classes = [ProjectEntityPermission]

    def get_queryset(self):
        return (
            EpicIssue.objects.annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("issue"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(epic_id=self.kwargs.get("epic_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .select_related("project")
            .select_related("workspace")
            .select_related("epic")
            .select_related("issue", "issue__state", "issue__project")
            .prefetch_related("issue__assignees", "issue__labels")
            .prefetch_related("epic__members")
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )

    @epic_issue_docs(
        operation_id="retrieve_epic_work_item",
        summary="Retrieve epic work item",
        description="Retrieve details of a specific epic work item.",
        parameters=[
            EPIC_ID_PARAMETER,
            ISSUE_ID_PARAMETER,
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        responses={
            200: create_paginated_response(
                IssueSerializer,
                "PaginatedEpicIssueDetailResponse",
                "Paginated list of epic work item details",
                "Epic Work Item Details",
            ),
            404: OpenApiResponse(description="Epic not found"),
        },
    )
    def get(self, request, slug, project_id, epic_id, issue_id):
        """List epic work items

        Retrieve all work items assigned to a epic with detailed information.
        Returns paginated results including assignees, labels, and attachments.
        """
        order_by = request.GET.get("order_by", "created_at")
        issues = (
            Issue.issue_objects.filter(
                issue_epic__epic_id=epic_id,
                issue_epic__deleted_at__isnull=True,
                pk=issue_id,
            )
            .annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(bridge_id=F("issue_epic__id"))
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

    @epic_issue_docs(
        operation_id="delete_epic_work_item",
        summary="Delete epic work item",
        description="Remove a work item from a epic while keeping the work item in the project.",
        parameters=[
            EPIC_ID_PARAMETER,
            ISSUE_ID_PARAMETER,
        ],
        responses={
            204: DELETED_RESPONSE,
            404: EPIC_ISSUE_NOT_FOUND_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, epic_id, issue_id):
        """Remove epic work item

        Remove a work item from a epic while keeping the work item in the project.
        Records the removal activity for tracking purposes.
        """
        epic_issue = EpicIssue.objects.get(
            workspace__slug=slug,
            project_id=project_id,
            epic_id=epic_id,
            issue_id=issue_id,
        )

        epic_name = epic_issue.epic.name if epic_issue.epic is not None else ""
        epic_issue.delete()
        issue_activity.delay(
            type="epic.activity.deleted",
            requested_data=json.dumps({"epic_id": str(epic_id), "issues": [str(epic_issue.issue_id)]}),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=json.dumps({"epic_name": epic_name}),
            epoch=int(timezone.now().timestamp()),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class EpicArchiveUnarchiveAPIEndpoint(BaseAPIView):
    permission_classes = [ProjectEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            Epic.objects.filter(project_id=self.kwargs.get("project_id"))
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(archived_at__isnull=False)
            .select_related("project")
            .select_related("workspace")
            .select_related("lead")
            .prefetch_related("members")
            .prefetch_related(
                Prefetch(
                    "link_epic",
                    queryset=EpicLink.objects.select_related("epic", "created_by"),
                )
            )
            .annotate(
                total_issues=Count(
                    "issue_epic",
                    filter=Q(
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                completed_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="completed",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                cancelled_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="cancelled",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                started_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="started",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                unstarted_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="unstarted",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .annotate(
                backlog_issues=Count(
                    "issue_epic__issue__state__group",
                    filter=Q(
                        issue_epic__issue__state__group="backlog",
                        issue_epic__issue__archived_at__isnull=True,
                        issue_epic__issue__is_draft=False,
                        issue_epic__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
        )

    @epic_docs(
        operation_id="list_archived_epics",
        summary="List archived epics",
        description="Retrieve all epics that have been archived in the project.",
        parameters=[
            CURSOR_PARAMETER,
            PER_PAGE_PARAMETER,
            ORDER_BY_PARAMETER,
            FIELDS_PARAMETER,
            EXPAND_PARAMETER,
        ],
        request={},
        responses={
            200: create_paginated_response(
                EpicSerializer,
                "PaginatedArchivedEpicResponse",
                "Paginated list of archived epics",
                "Paginated Archived Epics",
            ),
            404: OpenApiResponse(description="Project not found"),
        },
    )
    def get(self, request, slug, project_id):
        """List archived epics

        Retrieve all epics that have been archived in the project.
        Returns paginated results with epic statistics.
        """
        return self.paginate(
            request=request,
            queryset=(self.get_queryset()),
            on_results=lambda epics: EpicSerializer(
                epics, many=True, fields=self.fields, expand=self.expand
            ).data,
        )

    @epic_docs(
        operation_id="archive_epic",
        summary="Archive epic",
        description="Move a epic to archived status for historical tracking.",
        parameters=[
            EPIC_PK_PARAMETER,
        ],
        request={},
        responses={
            204: None,
            400: CANNOT_ARCHIVE_RESPONSE,
            404: EPIC_NOT_FOUND_RESPONSE,
        },
    )
    def post(self, request, slug, project_id, pk):
        """Archive epic

        Move a completed epic to archived status for historical tracking.
        Only epics with completed status can be archived.
        """
        epic = Epic.objects.get(pk=pk, project_id=project_id, workspace__slug=slug)
        if epic.status not in ["completed", "cancelled"]:
            return Response(
                {"error": "Only completed or cancelled epics can be archived"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        epic.archived_at = timezone.now()
        epic.save()
        UserFavorite.objects.filter(
            entity_type="epic",
            entity_identifier=pk,
            project_id=project_id,
            workspace__slug=slug,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @epic_docs(
        operation_id="unarchive_epic",
        summary="Unarchive epic",
        description="Restore an archived epic to active status, making it available for regular use.",
        parameters=[
            EPIC_PK_PARAMETER,
        ],
        responses={
            204: None,
            404: EPIC_NOT_FOUND_RESPONSE,
        },
    )
    def delete(self, request, slug, project_id, pk):
        """Unarchive epic

        Restore an archived epic to active status, making it available for regular use.
        The epic will reappear in active epic lists and become fully functional.
        """
        epic = Epic.objects.get(pk=pk, project_id=project_id, workspace__slug=slug)
        epic.archived_at = None
        epic.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

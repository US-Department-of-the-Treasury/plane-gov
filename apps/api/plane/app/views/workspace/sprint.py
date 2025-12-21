# Django imports
from django.db.models import Q, Count

# Third party epics
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.views.base import BaseAPIView
from plane.db.models import Sprint
from plane.app.permissions import WorkspaceViewerPermission
from plane.app.serializers.sprint import SprintSerializer


class WorkspaceSprintsEndpoint(BaseAPIView):
    permission_classes = [WorkspaceViewerPermission]

    def get(self, request, slug):
        sprints = (
            Sprint.objects.filter(workspace__slug=slug)
            .select_related("project")
            .select_related("workspace")
            .select_related("owned_by")
            .filter(archived_at__isnull=True)
            .annotate(
                total_issues=Count(
                    "issue_sprint",
                    filter=Q(
                        issue_sprint__issue__archived_at__isnull=True,
                        issue_sprint__issue__is_draft=False,
                        issue_sprint__deleted_at__isnull=True,
                        issue_sprint__issue__deleted_at__isnull=True,
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
                        issue_sprint__issue__deleted_at__isnull=True,
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
                        issue_sprint__issue__deleted_at__isnull=True,
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
                        issue_sprint__issue__deleted_at__isnull=True,
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
                        issue_sprint__issue__deleted_at__isnull=True,
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
                        issue_sprint__issue__deleted_at__isnull=True,
                        issue_sprint__deleted_at__isnull=True,
                    ),
                )
            )
            .order_by(self.kwargs.get("order_by", "-created_at"))
            .distinct()
        )
        serializer = SprintSerializer(sprints, many=True).data
        return Response(serializer, status=status.HTTP_200_OK)

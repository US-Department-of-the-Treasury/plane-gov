# Django imports
from django.db.models import Prefetch, Q, Count

# Third party epics
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.views.base import BaseAPIView
from plane.db.models import Epic, EpicLink
from plane.app.permissions import WorkspaceViewerPermission
from plane.app.serializers.epic import EpicSerializer


class WorkspaceEpicsEndpoint(BaseAPIView):
    permission_classes = [WorkspaceViewerPermission]

    def get(self, request, slug):
        epics = (
            Epic.objects.filter(workspace__slug=slug)
            .select_related("project")
            .select_related("workspace")
            .select_related("lead")
            .prefetch_related("members")
            .filter(archived_at__isnull=True)
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

        serializer = EpicSerializer(epics, many=True).data
        return Response(serializer, status=status.HTTP_200_OK)

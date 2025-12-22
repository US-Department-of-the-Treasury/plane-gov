# Django imports
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields import ArrayField
from django.db.models import (
    Case,
    Count,
    F,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    UUIDField,
    Value,
    When,
)
from django.db.models.functions import Coalesce

# Third Party imports
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Package imports
from plane.db.models import DeployBoard, Issue, IssueReaction, IssueVote, SprintIssue, State
from plane.space.views.base import BaseAPIView


class RoadmapPublicEndpoint(BaseAPIView):
    """
    Public roadmap endpoint for projects with is_roadmap_view enabled.
    Returns issues grouped by state group for Canny-style roadmap display.
    """

    permission_classes = [AllowAny]

    def get(self, request, anchor):
        # Verify the deploy board exists and has roadmap view enabled
        deploy_board = DeployBoard.objects.filter(
            anchor=anchor,
            entity_name="project",
            is_roadmap_view=True,
        ).first()

        if not deploy_board:
            return Response(
                {"error": "Roadmap is not published for this project"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project_id = deploy_board.entity_identifier
        workspace_slug = deploy_board.workspace.slug

        # Get project states grouped by state group for roadmap columns
        states = (
            State.objects.filter(
                workspace__slug=workspace_slug,
                project_id=project_id,
            )
            .values("id", "name", "color", "group", "sequence")
            .order_by("sequence")
        )

        # Build issue queryset with vote counts
        issue_queryset = (
            Issue.issue_objects.filter(
                workspace__slug=workspace_slug,
                project_id=project_id,
                archived_at__isnull=True,
                is_draft=False,
            )
            .select_related("state")
            .prefetch_related("labels")
            .prefetch_related(
                Prefetch(
                    "votes",
                    queryset=IssueVote.objects.filter(deleted_at__isnull=True),
                )
            )
            .annotate(
                vote_count=Count(
                    "votes",
                    filter=Q(votes__deleted_at__isnull=True, votes__vote=1),
                ),
                label_ids=Coalesce(
                    ArrayAgg(
                        "labels__id",
                        distinct=True,
                        filter=Q(
                            ~Q(labels__id__isnull=True) & Q(label_issue__deleted_at__isnull=True)
                        ),
                    ),
                    Value([], output_field=ArrayField(UUIDField())),
                ),
            )
            .values(
                "id",
                "name",
                "description_stripped",
                "state_id",
                "state__group",
                "state__name",
                "state__color",
                "priority",
                "vote_count",
                "label_ids",
                "created_at",
                "target_date",
                "sequence_id",
            )
            .order_by("-vote_count", "-created_at")
        )

        # Group issues by state group for roadmap columns
        state_groups = ["backlog", "unstarted", "started", "completed", "cancelled"]
        grouped_issues = {group: [] for group in state_groups}

        for issue in issue_queryset:
            group = issue.get("state__group", "backlog")
            if group in grouped_issues:
                grouped_issues[group].append(issue)

        # Get state group counts
        state_group_counts = {}
        for group, issues in grouped_issues.items():
            state_group_counts[group] = len(issues)

        return Response(
            {
                "states": list(states),
                "issues": grouped_issues,
                "counts": state_group_counts,
                "settings": {
                    "is_votes_enabled": deploy_board.is_votes_enabled,
                    "is_comments_enabled": deploy_board.is_comments_enabled,
                    "is_reactions_enabled": deploy_board.is_reactions_enabled,
                },
            },
            status=status.HTTP_200_OK,
        )


class RoadmapSettingsEndpoint(BaseAPIView):
    """
    Returns roadmap-specific settings for a published project.
    """

    permission_classes = [AllowAny]

    def get(self, request, anchor):
        deploy_board = DeployBoard.objects.filter(
            anchor=anchor,
            entity_name="project",
            is_roadmap_view=True,
        ).first()

        if not deploy_board:
            return Response(
                {"error": "Roadmap is not published for this project"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "anchor": deploy_board.anchor,
                "is_roadmap_view": deploy_board.is_roadmap_view,
                "is_votes_enabled": deploy_board.is_votes_enabled,
                "is_comments_enabled": deploy_board.is_comments_enabled,
                "is_reactions_enabled": deploy_board.is_reactions_enabled,
                "workspace_slug": deploy_board.workspace.slug,
                "project_id": str(deploy_board.entity_identifier),
            },
            status=status.HTTP_200_OK,
        )

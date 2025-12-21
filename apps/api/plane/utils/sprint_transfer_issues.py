# Python imports
import json

# Django imports
from django.db.models import (
    Case,
    Count,
    F,
    Q,
    Sum,
    FloatField,
    Value,
    When,
)
from django.db import models
from django.db.models.functions import Cast, Concat
from django.utils import timezone

# Package imports
from plane.db.models import (
    Sprint,
    SprintIssue,
    Issue,
    Project,
)
from plane.utils.analytics_plot import burndown_plot
from plane.bgtasks.issue_activities_task import issue_activity
from plane.utils.host import base_host


def transfer_sprint_issues(
    slug,
    project_id,
    sprint_id,
    new_sprint_id,
    request,
    user_id,
):
    """
    Transfer incomplete issues from one sprint to another and create progress snapshot.

    Args:
        slug: Workspace slug
        project_id: Project ID
        sprint_id: Source sprint ID
        new_sprint_id: Destination sprint ID
        request: HTTP request object
        user_id: User ID performing the transfer

    Returns:
        dict: Response data with success or error message
    """
    # Get the new sprint
    new_sprint = Sprint.objects.filter(workspace__slug=slug, project_id=project_id, pk=new_sprint_id).first()

    # Check if new sprint is already completed
    if new_sprint.end_date is not None and new_sprint.end_date < timezone.now():
        return {
            "success": False,
            "error": "The sprint where the issues are transferred is already completed",
        }

    # Get the old sprint with issue counts
    old_sprint = (
        Sprint.objects.filter(workspace__slug=slug, project_id=project_id, pk=sprint_id)
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
    )
    old_sprint = old_sprint.first()

    if old_sprint is None:
        return {
            "success": False,
            "error": "Source sprint not found",
        }

    # Check if project uses estimates
    estimate_type = Project.objects.filter(
        workspace__slug=slug,
        pk=project_id,
        estimate__isnull=False,
        estimate__type="points",
    ).exists()

    # Initialize estimate distribution variables
    assignee_estimate_distribution = []
    label_estimate_distribution = []
    estimate_completion_chart = {}

    if estimate_type:
        assignee_estimate_data = (
            Issue.issue_objects.filter(
                issue_sprint__sprint_id=sprint_id,
                issue_sprint__deleted_at__isnull=True,
                workspace__slug=slug,
                project_id=project_id,
            )
            .annotate(display_name=F("assignees__display_name"))
            .annotate(assignee_id=F("assignees__id"))
            .annotate(
                avatar_url=Case(
                    # If `avatar_asset` exists, use it to generate the asset URL
                    When(
                        assignees__avatar_asset__isnull=False,
                        then=Concat(
                            Value("/api/assets/v2/static/"),
                            "assignees__avatar_asset",
                            Value("/"),
                        ),
                    ),
                    # If `avatar_asset` is None, fall back to using `avatar` field directly
                    When(
                        assignees__avatar_asset__isnull=True,
                        then="assignees__avatar",
                    ),
                    default=Value(None),
                    output_field=models.CharField(),
                )
            )
            .values("display_name", "assignee_id", "avatar_url")
            .annotate(total_estimates=Sum(Cast("estimate_point__value", FloatField())))
            .annotate(
                completed_estimates=Sum(
                    Cast("estimate_point__value", FloatField()),
                    filter=Q(
                        completed_at__isnull=False,
                        archived_at__isnull=True,
                        is_draft=False,
                    ),
                )
            )
            .annotate(
                pending_estimates=Sum(
                    Cast("estimate_point__value", FloatField()),
                    filter=Q(
                        completed_at__isnull=True,
                        archived_at__isnull=True,
                        is_draft=False,
                    ),
                )
            )
            .order_by("display_name")
        )
        # Assignee estimate distribution serialization
        assignee_estimate_distribution = [
            {
                "display_name": item["display_name"],
                "assignee_id": (str(item["assignee_id"]) if item["assignee_id"] else None),
                "avatar_url": item.get("avatar_url"),
                "total_estimates": item["total_estimates"],
                "completed_estimates": item["completed_estimates"],
                "pending_estimates": item["pending_estimates"],
            }
            for item in assignee_estimate_data
        ]

        label_distribution_data = (
            Issue.issue_objects.filter(
                issue_sprint__sprint_id=sprint_id,
                issue_sprint__deleted_at__isnull=True,
                workspace__slug=slug,
                project_id=project_id,
            )
            .annotate(label_name=F("labels__name"))
            .annotate(color=F("labels__color"))
            .annotate(label_id=F("labels__id"))
            .values("label_name", "color", "label_id")
            .annotate(total_estimates=Sum(Cast("estimate_point__value", FloatField())))
            .annotate(
                completed_estimates=Sum(
                    Cast("estimate_point__value", FloatField()),
                    filter=Q(
                        completed_at__isnull=False,
                        archived_at__isnull=True,
                        is_draft=False,
                    ),
                )
            )
            .annotate(
                pending_estimates=Sum(
                    Cast("estimate_point__value", FloatField()),
                    filter=Q(
                        completed_at__isnull=True,
                        archived_at__isnull=True,
                        is_draft=False,
                    ),
                )
            )
            .order_by("label_name")
        )

        estimate_completion_chart = burndown_plot(
            queryset=old_sprint,
            slug=slug,
            project_id=project_id,
            plot_type="points",
            sprint_id=sprint_id,
        )
        # Label estimate distribution serialization
        label_estimate_distribution = [
            {
                "label_name": item["label_name"],
                "color": item["color"],
                "label_id": (str(item["label_id"]) if item["label_id"] else None),
                "total_estimates": item["total_estimates"],
                "completed_estimates": item["completed_estimates"],
                "pending_estimates": item["pending_estimates"],
            }
            for item in label_distribution_data
        ]

    # Get the assignee distribution
    assignee_distribution = (
        Issue.issue_objects.filter(
            issue_sprint__sprint_id=sprint_id,
            issue_sprint__deleted_at__isnull=True,
            workspace__slug=slug,
            project_id=project_id,
        )
        .annotate(display_name=F("assignees__display_name"))
        .annotate(assignee_id=F("assignees__id"))
        .annotate(
            avatar_url=Case(
                # If `avatar_asset` exists, use it to generate the asset URL
                When(
                    assignees__avatar_asset__isnull=False,
                    then=Concat(
                        Value("/api/assets/v2/static/"),
                        "assignees__avatar_asset",
                        Value("/"),
                    ),
                ),
                # If `avatar_asset` is None, fall back to using `avatar` field directly
                When(assignees__avatar_asset__isnull=True, then="assignees__avatar"),
                default=Value(None),
                output_field=models.CharField(),
            )
        )
        .values("display_name", "assignee_id", "avatar_url")
        .annotate(total_issues=Count("id", filter=Q(archived_at__isnull=True, is_draft=False)))
        .annotate(
            completed_issues=Count(
                "id",
                filter=Q(
                    completed_at__isnull=False,
                    archived_at__isnull=True,
                    is_draft=False,
                ),
            )
        )
        .annotate(
            pending_issues=Count(
                "id",
                filter=Q(
                    completed_at__isnull=True,
                    archived_at__isnull=True,
                    is_draft=False,
                ),
            )
        )
        .order_by("display_name")
    )
    # Assignee distribution serialized
    assignee_distribution_data = [
        {
            "display_name": item["display_name"],
            "assignee_id": (str(item["assignee_id"]) if item["assignee_id"] else None),
            "avatar_url": item.get("avatar_url"),
            "total_issues": item["total_issues"],
            "completed_issues": item["completed_issues"],
            "pending_issues": item["pending_issues"],
        }
        for item in assignee_distribution
    ]

    # Get the label distribution
    label_distribution = (
        Issue.issue_objects.filter(
            issue_sprint__sprint_id=sprint_id,
            issue_sprint__deleted_at__isnull=True,
            workspace__slug=slug,
            project_id=project_id,
        )
        .annotate(label_name=F("labels__name"))
        .annotate(color=F("labels__color"))
        .annotate(label_id=F("labels__id"))
        .values("label_name", "color", "label_id")
        .annotate(total_issues=Count("id", filter=Q(archived_at__isnull=True, is_draft=False)))
        .annotate(
            completed_issues=Count(
                "id",
                filter=Q(
                    completed_at__isnull=False,
                    archived_at__isnull=True,
                    is_draft=False,
                ),
            )
        )
        .annotate(
            pending_issues=Count(
                "id",
                filter=Q(
                    completed_at__isnull=True,
                    archived_at__isnull=True,
                    is_draft=False,
                ),
            )
        )
        .order_by("label_name")
    )

    # Label distribution serialization
    label_distribution_data = [
        {
            "label_name": item["label_name"],
            "color": item["color"],
            "label_id": (str(item["label_id"]) if item["label_id"] else None),
            "total_issues": item["total_issues"],
            "completed_issues": item["completed_issues"],
            "pending_issues": item["pending_issues"],
        }
        for item in label_distribution
    ]

    # Generate completion chart
    completion_chart = burndown_plot(
        queryset=old_sprint,
        slug=slug,
        project_id=project_id,
        plot_type="issues",
        sprint_id=sprint_id,
    )

    # Get the current sprint and save progress snapshot
    current_sprint = Sprint.objects.filter(workspace__slug=slug, project_id=project_id, pk=sprint_id).first()

    current_sprint.progress_snapshot = {
        "total_issues": old_sprint.total_issues,
        "completed_issues": old_sprint.completed_issues,
        "cancelled_issues": old_sprint.cancelled_issues,
        "started_issues": old_sprint.started_issues,
        "unstarted_issues": old_sprint.unstarted_issues,
        "backlog_issues": old_sprint.backlog_issues,
        "distribution": {
            "labels": label_distribution_data,
            "assignees": assignee_distribution_data,
            "completion_chart": completion_chart,
        },
        "estimate_distribution": (
            {}
            if not estimate_type
            else {
                "labels": label_estimate_distribution,
                "assignees": assignee_estimate_distribution,
                "completion_chart": estimate_completion_chart,
            }
        ),
    }
    current_sprint.save(update_fields=["progress_snapshot"])

    # Get issues to transfer (only incomplete issues)
    sprint_issues = SprintIssue.objects.filter(
        sprint_id=sprint_id,
        project_id=project_id,
        workspace__slug=slug,
        issue__archived_at__isnull=True,
        issue__is_draft=False,
        issue__state__group__in=["backlog", "unstarted", "started"],
    )

    updated_sprints = []
    update_sprint_issue_activity = []
    for sprint_issue in sprint_issues:
        sprint_issue.sprint_id = new_sprint_id
        updated_sprints.append(sprint_issue)
        update_sprint_issue_activity.append(
            {
                "old_sprint_id": str(sprint_id),
                "new_sprint_id": str(new_sprint_id),
                "issue_id": str(sprint_issue.issue_id),
            }
        )

    # Bulk update sprint issues
    sprint_issues = SprintIssue.objects.bulk_update(updated_sprints, ["sprint_id"], batch_size=100)

    # Capture Issue Activity
    issue_activity.delay(
        type="sprint.activity.created",
        requested_data=json.dumps({"sprints_list": []}),
        actor_id=str(user_id),
        issue_id=None,
        project_id=str(project_id),
        current_instance=json.dumps(
            {
                "updated_sprint_issues": update_sprint_issue_activity,
                "created_sprint_issues": [],
            }
        ),
        epoch=int(timezone.now().timestamp()),
        notification=True,
        origin=base_host(request=request, is_app=True),
    )

    return {"success": True}

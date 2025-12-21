# Python imports
from datetime import timedelta

import pytz

# Django imports
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

# Module imports
from .base import BaseModel


def get_default_filters():
    return {
        "priority": None,
        "state": None,
        "state_group": None,
        "assignees": None,
        "created_by": None,
        "labels": None,
        "start_date": None,
        "target_date": None,
        "subscriber": None,
    }


def get_default_display_filters():
    return {
        "group_by": None,
        "order_by": "-created_at",
        "type": None,
        "sub_issue": True,
        "show_empty_groups": True,
        "layout": "list",
        "calendar_date_range": "",
    }


def get_default_display_properties():
    return {
        "assignee": True,
        "attachment_count": True,
        "created_on": True,
        "due_date": True,
        "estimate": True,
        "key": True,
        "labels": True,
        "link": True,
        "priority": True,
        "start_date": True,
        "state": True,
        "sub_issue_count": True,
        "updated_on": True,
    }


class Sprint(BaseModel):
    """
    Workspace-wide fixed 2-week sprints.

    Sprints are shared across all projects in a workspace and have a fixed
    14-day duration. They are auto-generated based on the workspace's
    sprint_start_date setting.
    """

    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="workspace_sprints",
    )
    number = models.PositiveIntegerField(verbose_name="Sprint Number")
    name = models.CharField(max_length=255, verbose_name="Sprint Name")
    description = models.TextField(verbose_name="Sprint Description", blank=True)
    start_date = models.DateTimeField(verbose_name="Start Date")
    end_date = models.DateTimeField(verbose_name="End Date")
    view_props = models.JSONField(default=dict)
    sort_order = models.FloatField(default=65535)
    external_source = models.CharField(max_length=255, null=True, blank=True)
    external_id = models.CharField(max_length=255, blank=True, null=True)
    progress_snapshot = models.JSONField(default=dict)
    archived_at = models.DateTimeField(null=True)
    logo_props = models.JSONField(default=dict)
    # timezone
    TIMEZONE_CHOICES = tuple(zip(pytz.common_timezones, pytz.common_timezones))
    timezone = models.CharField(max_length=255, default="UTC", choices=TIMEZONE_CHOICES)
    version = models.IntegerField(default=1)

    class Meta:
        verbose_name = "Sprint"
        verbose_name_plural = "Sprints"
        db_table = "sprints"
        ordering = ("number",)
        unique_together = ["workspace", "number", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "number"],
                condition=models.Q(deleted_at__isnull=True),
                name="sprint_unique_workspace_number_when_deleted_at_null",
            )
        ]

    def clean(self):
        """Validate sprint has exactly 14-day duration."""
        super().clean()
        if self.start_date and self.end_date:
            expected_end = self.start_date + timedelta(days=13)
            if self.end_date.date() != expected_end.date():
                raise ValidationError(
                    "Sprint must be exactly 14 days (2 weeks). "
                    f"Expected end date: {expected_end.date()}, got: {self.end_date.date()}"
                )

    def save(self, *args, **kwargs):
        # Auto-set name if not provided
        if not self.name:
            self.name = f"Sprint {self.number}"

        # Auto-calculate end_date from start_date if not set
        if self.start_date and not self.end_date:
            self.end_date = self.start_date + timedelta(days=13)

        # Set sort_order based on number for consistent ordering
        if self._state.adding:
            self.sort_order = self.number * 10000

        super(Sprint, self).save(*args, **kwargs)

    def __str__(self):
        """Return name of the sprint"""
        return f"{self.name} <{self.workspace.name}>"

    @property
    def is_current(self):
        """Check if this sprint is the current one based on dates."""
        from django.utils import timezone

        now = timezone.now()
        return self.start_date <= now <= self.end_date

    @property
    def is_upcoming(self):
        """Check if this sprint is in the future."""
        from django.utils import timezone

        return self.start_date > timezone.now()

    @property
    def is_completed(self):
        """Check if this sprint has ended."""
        from django.utils import timezone

        return self.end_date < timezone.now()


class SprintIssue(BaseModel):
    """
    Links issues to sprints.

    Since sprints are workspace-wide, issues from any project in the workspace
    can be assigned to any sprint.
    """

    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="workspace_sprint_issues",
    )
    issue = models.ForeignKey("db.Issue", on_delete=models.CASCADE, related_name="issue_sprint")
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name="sprint_issues")

    class Meta:
        unique_together = ["issue", "sprint", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["sprint", "issue"],
                condition=models.Q(deleted_at__isnull=True),
                name="sprint_issue_when_deleted_at_null",
            )
        ]
        verbose_name = "Sprint Issue"
        verbose_name_plural = "Sprint Issues"
        db_table = "sprint_issues"
        ordering = ("-created_at",)

    def save(self, *args, **kwargs):
        # Auto-set workspace from sprint
        if self.sprint:
            self.workspace = self.sprint.workspace
        super(SprintIssue, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.issue} in {self.sprint}"


class SprintUserProperties(BaseModel):
    """
    User-specific view preferences for a sprint.
    """

    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="workspace_sprint_user_properties",
    )
    sprint = models.ForeignKey("db.Sprint", on_delete=models.CASCADE, related_name="sprint_user_properties")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sprint_user_properties",
    )
    filters = models.JSONField(default=get_default_filters)
    display_filters = models.JSONField(default=get_default_display_filters)
    display_properties = models.JSONField(default=get_default_display_properties)
    rich_filters = models.JSONField(default=dict)

    class Meta:
        unique_together = ["sprint", "user", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["sprint", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="sprint_user_properties_unique_sprint_user_when_deleted_at_null",
            )
        ]
        verbose_name = "Sprint User Property"
        verbose_name_plural = "Sprint User Properties"
        db_table = "sprint_user_properties"
        ordering = ("-created_at",)

    def save(self, *args, **kwargs):
        # Auto-set workspace from sprint
        if self.sprint:
            self.workspace = self.sprint.workspace
        super(SprintUserProperties, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.sprint.name} {self.user.email}"

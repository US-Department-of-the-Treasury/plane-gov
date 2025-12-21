# Third party imports
from rest_framework import serializers

# Module imports
from .base import BaseSerializer
from plane.db.models import Sprint, SprintIssue


class SprintSerializer(BaseSerializer):
    """
    Sprint serializer with comprehensive workspace metrics and time tracking.

    Provides sprint details including work item counts by status, progress estimates,
    and time-bound iteration data for workspace management and sprint planning.
    """

    total_issues = serializers.IntegerField(read_only=True)
    cancelled_issues = serializers.IntegerField(read_only=True)
    completed_issues = serializers.IntegerField(read_only=True)
    started_issues = serializers.IntegerField(read_only=True)
    unstarted_issues = serializers.IntegerField(read_only=True)
    backlog_issues = serializers.IntegerField(read_only=True)
    total_estimates = serializers.FloatField(read_only=True)
    completed_estimates = serializers.FloatField(read_only=True)
    started_estimates = serializers.FloatField(read_only=True)

    class Meta:
        model = Sprint
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "workspace",
            "number",
            "deleted_at",
        ]


class SprintIssueSerializer(BaseSerializer):
    """
    Serializer for sprint-issue relationships with sub-issue counting.

    Manages the association between sprints and work items, including
    hierarchical issue tracking for nested work item structures.
    """

    sub_issues_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SprintIssue
        fields = "__all__"
        read_only_fields = ["workspace", "sprint"]


class SprintLiteSerializer(BaseSerializer):
    """
    Lightweight sprint serializer for minimal data transfer.

    Provides essential sprint information without computed metrics,
    optimized for list views and reference lookups.
    """

    class Meta:
        model = Sprint
        fields = "__all__"


class SprintIssueRequestSerializer(serializers.Serializer):
    """
    Serializer for bulk work item assignment to sprints.

    Validates work item ID lists for batch operations including
    sprint assignment and sprint planning workflows.
    """

    issues = serializers.ListField(child=serializers.UUIDField(), help_text="List of issue IDs to add to the sprint")


class TransferSprintIssueRequestSerializer(serializers.Serializer):
    """
    Serializer for transferring work items between sprints.

    Handles work item migration between sprints including validation
    and relationship updates for sprint reallocation workflows.
    """

    new_sprint_id = serializers.UUIDField(help_text="ID of the target sprint to transfer issues to")

# Third party imports
from rest_framework import serializers

# Module imports
from .base import BaseSerializer
from .issue import IssueStateSerializer
from plane.db.models import Sprint, SprintIssue, SprintUserProperties


class SprintWriteSerializer(BaseSerializer):
    """
    Serializer for updating workspace sprints.

    Only allows updating name, description, logo_props, view_props, and sort_order.
    Dates are auto-calculated and cannot be changed.
    """

    class Meta:
        model = Sprint
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "archived_at",
            "number",
            "start_date",
            "end_date",
        ]


class SprintSerializer(BaseSerializer):
    # favorite
    is_favorite = serializers.BooleanField(read_only=True)
    total_issues = serializers.IntegerField(read_only=True)
    # state group wise distribution
    cancelled_issues = serializers.IntegerField(read_only=True)
    completed_issues = serializers.IntegerField(read_only=True)
    started_issues = serializers.IntegerField(read_only=True)
    unstarted_issues = serializers.IntegerField(read_only=True)
    backlog_issues = serializers.IntegerField(read_only=True)

    # active | draft | upcoming | completed
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Sprint
        fields = [
            # necessary fields
            "id",
            "workspace_id",
            "number",
            # model fields
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
            # meta fields
            "is_favorite",
            "total_issues",
            "cancelled_issues",
            "completed_issues",
            "started_issues",
            "unstarted_issues",
            "backlog_issues",
            "status",
        ]
        read_only_fields = fields


class SprintIssueSerializer(BaseSerializer):
    issue_detail = IssueStateSerializer(read_only=True, source="issue")
    sub_issues_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SprintIssue
        fields = "__all__"
        read_only_fields = ["workspace", "sprint"]


class SprintUserPropertiesSerializer(BaseSerializer):
    class Meta:
        model = SprintUserProperties
        fields = "__all__"
        read_only_fields = ["workspace", "sprint", "user"]

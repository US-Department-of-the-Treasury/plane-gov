# Third party imports
import pytz
from rest_framework import serializers

# Package imports
from .base import BaseSerializer
from plane.db.models import Sprint, SprintIssue, User, Project
from plane.utils.timezone_converter import convert_to_utc


class SprintCreateSerializer(BaseSerializer):
    """
    Serializer for creating sprints with timezone handling and date validation.

    Manages sprint creation including project timezone conversion, date range validation,
    and UTC normalization for time-bound iteration planning and sprint management.
    """

    owned_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
        help_text="User who owns the sprint. If not provided, defaults to the current user.",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        project = self.context.get("project")
        if project and project.timezone:
            project_timezone = pytz.timezone(project.timezone)
            self.fields["start_date"].timezone = project_timezone
            self.fields["end_date"].timezone = project_timezone

    class Meta:
        model = Sprint
        fields = [
            "name",
            "description",
            "start_date",
            "end_date",
            "owned_by",
            "external_source",
            "external_id",
            "timezone",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "deleted_at",
        ]

    def validate(self, data):
        project_id = self.initial_data.get("project_id") or (
            self.instance.project_id if self.instance and hasattr(self.instance, "project_id") else None
        )

        if not project_id:
            raise serializers.ValidationError("Project ID is required")

        project = Project.objects.filter(id=project_id).first()
        if not project:
            raise serializers.ValidationError("Project not found")
        if not project.sprint_view:
            raise serializers.ValidationError("Sprints are not enabled for this project")
        if (
            data.get("start_date", None) is not None
            and data.get("end_date", None) is not None
            and data.get("start_date", None) > data.get("end_date", None)
        ):
            raise serializers.ValidationError("Start date cannot exceed end date")

        if data.get("start_date", None) is not None and data.get("end_date", None) is not None:
            data["start_date"] = convert_to_utc(
                date=str(data.get("start_date").date()),
                project_id=project_id,
                is_start_date=True,
            )
            data["end_date"] = convert_to_utc(
                date=str(data.get("end_date", None).date()),
                project_id=project_id,
            )

        if not data.get("owned_by"):
            data["owned_by"] = self.context["request"].user

        return data


class SprintUpdateSerializer(SprintCreateSerializer):
    """
    Serializer for updating sprints with enhanced ownership management.

    Extends sprint creation with update-specific features including ownership
    assignment and modification tracking for sprint lifesprint management.
    """

    class Meta(SprintCreateSerializer.Meta):
        model = Sprint
        fields = SprintCreateSerializer.Meta.fields + [
            "owned_by",
        ]


class SprintSerializer(BaseSerializer):
    """
    Sprint serializer with comprehensive project metrics and time tracking.

    Provides sprint details including work item counts by status, progress estimates,
    and time-bound iteration data for project management and sprint planning.
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
            "project",
            "owned_by",
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
        read_only_fields = ["workspace", "project", "sprint"]


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

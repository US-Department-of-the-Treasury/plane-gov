# Third party imports
from rest_framework import serializers

# Package imports
from .base import BaseSerializer
from plane.db.models import (
    User,
    Epic,
    EpicLink,
    EpicMember,
    EpicIssue,
    ProjectMember,
    Project,
)


class EpicCreateSerializer(BaseSerializer):
    """
    Serializer for creating epics with member validation and date checking.

    Handles epic creation including member assignment validation, date range
    verification, and duplicate name prevention for feature-based
    project organization setup.
    """

    members = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=User.objects.all()),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Epic
        fields = [
            "name",
            "description",
            "start_date",
            "target_date",
            "status",
            "lead",
            "members",
            "external_source",
            "external_id",
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
        project_id = self.context.get("project_id")
        if not project_id:
            raise serializers.ValidationError("Project ID is required")
        project = Project.objects.get(id=project_id)
        if not project:
            raise serializers.ValidationError("Project not found")
        if not project.epic_view:
            raise serializers.ValidationError("Epics are not enabled for this project")
        if (
            data.get("start_date", None) is not None
            and data.get("target_date", None) is not None
            and data.get("start_date", None) > data.get("target_date", None)
        ):
            raise serializers.ValidationError("Start date cannot exceed target date")

        if data.get("members", []):
            data["members"] = ProjectMember.objects.filter(
                project_id=self.context.get("project_id"), member_id__in=data["members"]
            ).values_list("member_id", flat=True)

        return data

    def create(self, validated_data):
        members = validated_data.pop("members", None)

        project_id = self.context["project_id"]
        workspace_id = self.context["workspace_id"]

        epic_name = validated_data.get("name")
        if epic_name:
            # Lookup for the epic name in the epic table for that project
            epic = Epic.objects.filter(name=epic_name, project_id=project_id).first()
            if epic:
                raise serializers.ValidationError(
                    {
                        "id": str(epic.id),
                        "code": "EPIC_NAME_ALREADY_EXISTS",
                        "error": "Epic with this name already exists",
                        "message": "Epic with this name already exists",
                    }
                )

        epic = Epic.objects.create(**validated_data, project_id=project_id)
        if members is not None:
            EpicMember.objects.bulk_create(
                [
                    EpicMember(
                        epic=epic,
                        member_id=str(member),
                        project_id=project_id,
                        workspace_id=workspace_id,
                        created_by=epic.created_by,
                        updated_by=epic.updated_by,
                    )
                    for member in members
                ],
                batch_size=10,
                ignore_conflicts=True,
            )

        return epic


class EpicUpdateSerializer(EpicCreateSerializer):
    """
    Serializer for updating epics with enhanced validation and member management.

    Extends epic creation with update-specific validations including
    member reassignment, name conflict checking,
    and relationship management for epic modifications.
    """

    class Meta(EpicCreateSerializer.Meta):
        model = Epic
        fields = EpicCreateSerializer.Meta.fields + [
            "members",
        ]
        read_only_fields = EpicCreateSerializer.Meta.read_only_fields

    def update(self, instance, validated_data):
        members = validated_data.pop("members", None)
        epic_name = validated_data.get("name")
        if epic_name:
            # Lookup for the epic name in the epic table for that project
            if Epic.objects.filter(name=epic_name, project=instance.project).exclude(id=instance.id).exists():
                raise serializers.ValidationError({"error": "Epic with this name already exists"})

        if members is not None:
            EpicMember.objects.filter(epic=instance).delete()
            EpicMember.objects.bulk_create(
                [
                    EpicMember(
                        epic=instance,
                        member_id=str(member),
                        project=instance.project,
                        workspace=instance.project.workspace,
                        created_by=instance.created_by,
                        updated_by=instance.updated_by,
                    )
                    for member in members
                ],
                batch_size=10,
                ignore_conflicts=True,
            )

        return super().update(instance, validated_data)


class EpicSerializer(BaseSerializer):
    """
    Comprehensive epic serializer with work item metrics and member management.

    Provides complete epic data including work item counts by status, member
    relationships, and progress tracking for feature-based project organization.
    """

    members = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=User.objects.all()),
        write_only=True,
        required=False,
    )
    total_issues = serializers.IntegerField(read_only=True)
    cancelled_issues = serializers.IntegerField(read_only=True)
    completed_issues = serializers.IntegerField(read_only=True)
    started_issues = serializers.IntegerField(read_only=True)
    unstarted_issues = serializers.IntegerField(read_only=True)
    backlog_issues = serializers.IntegerField(read_only=True)

    class Meta:
        model = Epic
        fields = "__all__"
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["members"] = [str(member.id) for member in instance.members.all()]
        return data


class EpicIssueSerializer(BaseSerializer):
    """
    Serializer for epic-work item relationships with sub-item counting.

    Manages the association between epics and work items, including
    hierarchical issue tracking for nested work item structures.
    """

    sub_issues_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = EpicIssue
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "epic",
        ]


class EpicLinkSerializer(BaseSerializer):
    """
    Serializer for epic external links with URL validation.

    Handles external resource associations with epics including
    URL validation and duplicate prevention for reference management.
    """

    class Meta:
        model = EpicLink
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "epic",
        ]

    # Validation if url already exists
    def create(self, validated_data):
        if EpicLink.objects.filter(url=validated_data.get("url"), epic_id=validated_data.get("epic_id")).exists():
            raise serializers.ValidationError({"error": "URL already exists for this Issue"})
        return EpicLink.objects.create(**validated_data)


class EpicLiteSerializer(BaseSerializer):
    """
    Lightweight epic serializer for minimal data transfer.

    Provides essential epic information without computed metrics,
    optimized for list views and reference lookups.
    """

    class Meta:
        model = Epic
        fields = "__all__"


class EpicIssueRequestSerializer(serializers.Serializer):
    """
    Serializer for bulk work item assignment to epics.

    Validates work item ID lists for batch operations including
    epic assignment and work item organization workflows.
    """

    issues = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of issue IDs to add to the epic",
    )

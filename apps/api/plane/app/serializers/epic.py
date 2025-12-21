# Third Party imports
from rest_framework import serializers

# Package imports
from .base import BaseSerializer, DynamicBaseSerializer
from .project import ProjectLiteSerializer

# Django imports
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError

from plane.db.models import (
    User,
    Epic,
    EpicMember,
    EpicIssue,
    EpicLink,
    EpicUserProperties,
)


class EpicWriteSerializer(BaseSerializer):
    lead_id = serializers.PrimaryKeyRelatedField(
        source="lead", queryset=User.objects.all(), required=False, allow_null=True
    )
    member_ids = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=User.objects.all()),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Epic
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "archived_at",
            "deleted_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["member_ids"] = [str(member.id) for member in instance.members.all()]
        return data

    def validate(self, data):
        if (
            data.get("start_date", None) is not None
            and data.get("target_date", None) is not None
            and data.get("start_date", None) > data.get("target_date", None)
        ):
            raise serializers.ValidationError("Start date cannot exceed target date")
        return data

    def create(self, validated_data):
        members = validated_data.pop("member_ids", None)
        project = self.context["project"]

        epic_name = validated_data.get("name")
        if epic_name:
            # Lookup for the epic name in the epic table for that project
            if Epic.objects.filter(name=epic_name, project=project).exists():
                raise serializers.ValidationError({"error": "Epic with this name already exists"})

        epic = Epic.objects.create(**validated_data, project=project)
        if members is not None:
            EpicMember.objects.bulk_create(
                [
                    EpicMember(
                        epic=epic,
                        member=member,
                        project=project,
                        workspace=project.workspace,
                        created_by=epic.created_by,
                        updated_by=epic.updated_by,
                    )
                    for member in members
                ],
                batch_size=10,
                ignore_conflicts=True,
            )

        return epic

    def update(self, instance, validated_data):
        members = validated_data.pop("member_ids", None)
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
                        member=member,
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


class EpicFlatSerializer(BaseSerializer):
    class Meta:
        model = Epic
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]


class EpicIssueSerializer(BaseSerializer):
    epic_detail = EpicFlatSerializer(read_only=True, source="epic")
    issue_detail = ProjectLiteSerializer(read_only=True, source="issue")
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

    def to_internal_value(self, data):
        # Modify the URL before validation by appending http:// if missing
        url = data.get("url", "")
        if url and not url.startswith(("http://", "https://")):
            data["url"] = "http://" + url

        return super().to_internal_value(data)

    def validate_url(self, value):
        # Use Django's built-in URLValidator for validation
        url_validator = URLValidator()
        try:
            url_validator(value)
        except ValidationError:
            raise serializers.ValidationError({"error": "Invalid URL format."})

        return value

    def create(self, validated_data):
        validated_data["url"] = self.validate_url(validated_data.get("url"))
        if EpicLink.objects.filter(url=validated_data.get("url"), epic_id=validated_data.get("epic_id")).exists():
            raise serializers.ValidationError({"error": "URL already exists."})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data["url"] = self.validate_url(validated_data.get("url"))
        if (
            EpicLink.objects.filter(url=validated_data.get("url"), epic_id=instance.epic_id)
            .exclude(pk=instance.id)
            .exists()
        ):
            raise serializers.ValidationError({"error": "URL already exists for this Issue"})

        return super().update(instance, validated_data)


class EpicSerializer(DynamicBaseSerializer):
    member_ids = serializers.ListField(child=serializers.UUIDField(), required=False, allow_null=True)
    is_favorite = serializers.BooleanField(read_only=True)
    total_issues = serializers.IntegerField(read_only=True)
    cancelled_issues = serializers.IntegerField(read_only=True)
    completed_issues = serializers.IntegerField(read_only=True)
    started_issues = serializers.IntegerField(read_only=True)
    unstarted_issues = serializers.IntegerField(read_only=True)
    backlog_issues = serializers.IntegerField(read_only=True)
    total_estimate_points = serializers.FloatField(read_only=True)
    completed_estimate_points = serializers.FloatField(read_only=True)

    class Meta:
        model = Epic
        fields = [
            # Required fields
            "id",
            "workspace_id",
            "project_id",
            # Model fields
            "name",
            "description",
            "description_text",
            "description_html",
            "start_date",
            "target_date",
            "status",
            "lead_id",
            "member_ids",
            "view_props",
            "sort_order",
            "external_source",
            "external_id",
            "logo_props",
            # computed fields
            "total_estimate_points",
            "completed_estimate_points",
            "is_favorite",
            "total_issues",
            "cancelled_issues",
            "completed_issues",
            "started_issues",
            "unstarted_issues",
            "backlog_issues",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = fields


class EpicDetailSerializer(EpicSerializer):
    link_epic = EpicLinkSerializer(read_only=True, many=True)
    sub_issues = serializers.IntegerField(read_only=True)
    backlog_estimate_points = serializers.FloatField(read_only=True)
    unstarted_estimate_points = serializers.FloatField(read_only=True)
    started_estimate_points = serializers.FloatField(read_only=True)
    cancelled_estimate_points = serializers.FloatField(read_only=True)

    class Meta(EpicSerializer.Meta):
        fields = EpicSerializer.Meta.fields + [
            "link_epic",
            "sub_issues",
            "backlog_estimate_points",
            "unstarted_estimate_points",
            "started_estimate_points",
            "cancelled_estimate_points",
        ]


class EpicUserPropertiesSerializer(BaseSerializer):
    class Meta:
        model = EpicUserProperties
        fields = "__all__"
        read_only_fields = ["workspace", "project", "epic", "user"]

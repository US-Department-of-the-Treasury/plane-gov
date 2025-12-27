# Third party imports
from rest_framework import serializers
import base64

# Package imports
from .base import BaseSerializer
from plane.utils.content_validator import (
    validate_binary_data,
    validate_html_content,
)
from plane.db.models import (
    WikiCollection,
    WikiPage,
    WikiPageShare,
    WikiPageVersion,
    WikiPageAccessLog,
    User,
)


class WikiCollectionSerializer(BaseSerializer):
    """Serializer for WikiCollection model."""

    child_count = serializers.SerializerMethodField()
    page_count = serializers.SerializerMethodField()

    class Meta:
        model = WikiCollection
        fields = [
            "id",
            "name",
            "description",
            "icon",
            "parent",
            "sort_order",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "child_count",
            "page_count",
        ]
        read_only_fields = ["workspace", "created_by", "updated_by"]

    def get_child_count(self, obj):
        """Return count of child collections."""
        return obj.child_collections.filter(deleted_at__isnull=True).count()

    def get_page_count(self, obj):
        """Return count of pages in this collection."""
        return obj.pages.filter(deleted_at__isnull=True).count()


class WikiCollectionLiteSerializer(BaseSerializer):
    """Lightweight serializer for WikiCollection references."""

    class Meta:
        model = WikiCollection
        fields = [
            "id",
            "name",
            "icon",
            "parent",
        ]


class WikiPageShareSerializer(BaseSerializer):
    """Serializer for WikiPageShare model."""

    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = WikiPageShare
        fields = [
            "id",
            "page",
            "user",
            "permission",
            "workspace",
            "created_at",
            "created_by",
            "user_detail",
        ]
        read_only_fields = ["workspace", "created_by"]

    def get_user_detail(self, obj):
        """Return user details for the share."""
        return {
            "id": str(obj.user.id),
            "email": obj.user.email,
            "display_name": obj.user.display_name,
            "avatar": obj.user.avatar,
        }


class WikiPageSerializer(BaseSerializer):
    """Serializer for WikiPage model."""

    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    collection_detail = WikiCollectionLiteSerializer(source="collection", read_only=True)
    child_count = serializers.SerializerMethodField()

    class Meta:
        model = WikiPage
        fields = [
            "id",
            "name",
            "access",
            "owned_by",
            "collection",
            "collection_detail",
            "project",
            "parent",
            "is_locked",
            "locked_by",
            "sort_order",
            "logo_props",
            "view_props",
            "archived_at",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "is_owner",
            "can_edit",
            "child_count",
        ]
        read_only_fields = ["workspace", "owned_by", "created_by", "updated_by"]

    def get_is_owner(self, obj):
        """Check if current user is the page owner."""
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            return obj.owned_by_id == request.user.id
        return False

    def get_can_edit(self, obj):
        """Check if current user can edit the page."""
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return False

        user = request.user

        # Owner can always edit
        if obj.owned_by_id == user.id:
            return True

        # Check if user has edit or admin permission via share
        if obj.access == WikiPage.SHARED_ACCESS:
            share = obj.shares.filter(
                user=user,
                deleted_at__isnull=True,
                permission__in=[
                    WikiPageShare.EDIT_PERMISSION,
                    WikiPageShare.ADMIN_PERMISSION,
                ],
            ).first()
            return share is not None

        return False

    def get_child_count(self, obj):
        """Return count of child pages."""
        return obj.child_pages.filter(deleted_at__isnull=True).count()

    def create(self, validated_data):
        workspace_id = self.context["workspace_id"]
        owned_by_id = self.context["owned_by_id"]
        project_id = self.context.get("project_id")
        description = self.context.get("description", {})
        description_binary = self.context.get("description_binary")
        description_html = self.context.get("description_html", "<p></p>")

        return WikiPage.objects.create(
            **validated_data,
            workspace_id=workspace_id,
            owned_by_id=owned_by_id,
            project_id=project_id,
            description=description,
            description_binary=description_binary,
            description_html=description_html,
        )


class WikiPageDetailSerializer(WikiPageSerializer):
    """Serializer with full page content."""

    description_html = serializers.CharField(read_only=True)
    shares = WikiPageShareSerializer(many=True, read_only=True)

    class Meta(WikiPageSerializer.Meta):
        fields = WikiPageSerializer.Meta.fields + ["description_html", "shares"]


class WikiPageLiteSerializer(BaseSerializer):
    """Lightweight serializer for WikiPage references."""

    class Meta:
        model = WikiPage
        fields = [
            "id",
            "name",
            "access",
            "parent",
            "collection",
            "project",
            "sort_order",
            "logo_props",
            "is_locked",
            "archived_at",
        ]


class WikiPageVersionSerializer(BaseSerializer):
    """Serializer for WikiPageVersion model."""

    class Meta:
        model = WikiPageVersion
        fields = [
            "id",
            "workspace",
            "page",
            "last_saved_at",
            "owned_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["workspace", "page"]


class WikiPageVersionDetailSerializer(BaseSerializer):
    """Serializer with version content for restore/diff."""

    class Meta:
        model = WikiPageVersion
        fields = [
            "id",
            "workspace",
            "page",
            "last_saved_at",
            "description_binary",
            "description_html",
            "description_json",
            "owned_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["workspace", "page"]


class WikiPageAccessLogSerializer(BaseSerializer):
    """Serializer for WikiPageAccessLog model."""

    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = WikiPageAccessLog
        fields = [
            "id",
            "page",
            "user",
            "access_type",
            "ip_address",
            "user_agent",
            "metadata",
            "workspace",
            "created_at",
            "user_detail",
        ]
        read_only_fields = ["__all__"]

    def get_user_detail(self, obj):
        """Return user details for the log entry."""
        return {
            "id": str(obj.user.id),
            "email": obj.user.email,
            "display_name": obj.user.display_name,
        }


class WikiPageBinaryUpdateSerializer(serializers.Serializer):
    """Serializer for updating page binary description with validation."""

    description_binary = serializers.CharField(required=False, allow_blank=True)
    description_html = serializers.CharField(required=False, allow_blank=True)
    description = serializers.JSONField(required=False, allow_null=True)

    def validate_description_binary(self, value):
        """Validate the base64-encoded binary data."""
        if not value:
            return value

        try:
            # Decode the base64 data
            binary_data = base64.b64decode(value)

            # Validate the binary data
            is_valid, error_message = validate_binary_data(binary_data)
            if not is_valid:
                raise serializers.ValidationError(f"Invalid binary data: {error_message}")

            return binary_data
        except Exception as e:
            if isinstance(e, serializers.ValidationError):
                raise
            raise serializers.ValidationError("Failed to decode base64 data")

    def validate_description_html(self, value):
        """Validate the HTML content."""
        if not value:
            return value

        # Use the validation function from utils
        is_valid, error_message, sanitized_html = validate_html_content(value)
        if not is_valid:
            raise serializers.ValidationError(error_message)

        # Return sanitized HTML if available, otherwise return original
        return sanitized_html if sanitized_html is not None else value

    def update(self, instance, validated_data):
        """Update the page instance with validated data."""
        if "description_binary" in validated_data:
            instance.description_binary = validated_data.get("description_binary")

        if "description_html" in validated_data:
            instance.description_html = validated_data.get("description_html")

        if "description" in validated_data:
            instance.description = validated_data.get("description")

        instance.save()
        return instance

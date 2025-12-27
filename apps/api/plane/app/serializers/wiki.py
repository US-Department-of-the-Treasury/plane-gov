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
    WikiPageLabel,
    WikiPageAssignee,
    PageComment,
    PageCommentReaction,
    PageActivity,
    PageSubscriber,
    PageMention,
    PageRelation,
    PageRelationChoices,
    PageLink,
    PropertyDefinition,
    PagePropertyValue,
    User,
    Label,
    State,
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
            # Unified page model fields
            "page_type",
            "sequence_id",
            "state",
            "completed_at",
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


# === Property System Serializers ===


class PropertyDefinitionSerializer(BaseSerializer):
    """Serializer for PropertyDefinition model."""

    class Meta:
        model = PropertyDefinition
        fields = [
            "id",
            "name",
            "slug",
            "property_type",
            "description",
            "options",
            "default_value",
            "page_types",
            "sort_order",
            "is_system",
            "is_hidden",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["workspace", "is_system"]


class PropertyDefinitionLiteSerializer(BaseSerializer):
    """Lightweight serializer for PropertyDefinition references."""

    class Meta:
        model = PropertyDefinition
        fields = [
            "id",
            "name",
            "slug",
            "property_type",
            "options",
            "is_system",
        ]


class PagePropertyValueSerializer(BaseSerializer):
    """Serializer for PagePropertyValue model."""

    property_detail = PropertyDefinitionLiteSerializer(source="property", read_only=True)

    class Meta:
        model = PagePropertyValue
        fields = [
            "id",
            "page",
            "property",
            "property_detail",
            "value_text",
            "value_number",
            "value_date",
            "value_datetime",
            "value_boolean",
            "value_json",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["workspace"]

    def get_value(self, obj):
        """Return the appropriate value based on property type."""
        prop_type = obj.property.property_type
        if prop_type == "text":
            return obj.value_text
        elif prop_type == "number":
            return obj.value_number
        elif prop_type == "date":
            return obj.value_date
        elif prop_type == "checkbox":
            return obj.value_boolean
        else:
            return obj.value_json


# === Comment & Activity Serializers ===


class PageCommentReactionSerializer(BaseSerializer):
    """Serializer for PageCommentReaction model."""

    actor_detail = serializers.SerializerMethodField()

    class Meta:
        model = PageCommentReaction
        fields = [
            "id",
            "comment",
            "actor",
            "reaction",
            "workspace",
            "created_at",
            "actor_detail",
        ]
        read_only_fields = ["workspace", "actor"]

    def get_actor_detail(self, obj):
        return {
            "id": str(obj.actor.id),
            "email": obj.actor.email,
            "display_name": obj.actor.display_name,
            "avatar": obj.actor.avatar,
        }


class PageCommentSerializer(BaseSerializer):
    """Serializer for PageComment model."""

    actor_detail = serializers.SerializerMethodField()
    reactions = PageCommentReactionSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = PageComment
        fields = [
            "id",
            "page",
            "comment_stripped",
            "comment_json",
            "comment_html",
            "attachments",
            "actor",
            "access",
            "external_source",
            "external_id",
            "edited_at",
            "parent",
            "workspace",
            "created_at",
            "updated_at",
            "actor_detail",
            "reactions",
            "is_owner",
        ]
        read_only_fields = ["workspace", "actor", "comment_stripped"]

    def get_actor_detail(self, obj):
        if not obj.actor:
            return None
        return {
            "id": str(obj.actor.id),
            "email": obj.actor.email,
            "display_name": obj.actor.display_name,
            "avatar": obj.actor.avatar,
        }

    def get_is_owner(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and obj.actor:
            return obj.actor_id == request.user.id
        return False


class PageActivitySerializer(BaseSerializer):
    """Serializer for PageActivity model."""

    actor_detail = serializers.SerializerMethodField()

    class Meta:
        model = PageActivity
        fields = [
            "id",
            "page",
            "verb",
            "field",
            "old_value",
            "new_value",
            "comment",
            "attachments",
            "page_comment",
            "actor",
            "old_identifier",
            "new_identifier",
            "epoch",
            "workspace",
            "created_at",
            "actor_detail",
        ]
        read_only_fields = ["__all__"]

    def get_actor_detail(self, obj):
        if not obj.actor:
            return None
        return {
            "id": str(obj.actor.id),
            "email": obj.actor.email,
            "display_name": obj.actor.display_name,
            "avatar": obj.actor.avatar,
        }


class PageSubscriberSerializer(BaseSerializer):
    """Serializer for PageSubscriber model."""

    subscriber_detail = serializers.SerializerMethodField()

    class Meta:
        model = PageSubscriber
        fields = [
            "id",
            "page",
            "subscriber",
            "workspace",
            "created_at",
            "subscriber_detail",
        ]
        read_only_fields = ["workspace"]

    def get_subscriber_detail(self, obj):
        return {
            "id": str(obj.subscriber.id),
            "email": obj.subscriber.email,
            "display_name": obj.subscriber.display_name,
            "avatar": obj.subscriber.avatar,
        }


class PageMentionSerializer(BaseSerializer):
    """Serializer for PageMention model."""

    mentioned_user_detail = serializers.SerializerMethodField()

    class Meta:
        model = PageMention
        fields = [
            "id",
            "page",
            "mentioned_user",
            "workspace",
            "created_at",
            "mentioned_user_detail",
        ]
        read_only_fields = ["workspace"]

    def get_mentioned_user_detail(self, obj):
        return {
            "id": str(obj.mentioned_user.id),
            "email": obj.mentioned_user.email,
            "display_name": obj.mentioned_user.display_name,
            "avatar": obj.mentioned_user.avatar,
        }


# === Relation & Link Serializers ===


class PageRelationSerializer(BaseSerializer):
    """Serializer for PageRelation model."""

    related_page_detail = serializers.SerializerMethodField()

    class Meta:
        model = PageRelation
        fields = [
            "id",
            "page",
            "related_page",
            "relation_type",
            "workspace",
            "created_at",
            "updated_at",
            "related_page_detail",
        ]
        read_only_fields = ["workspace"]

    def get_related_page_detail(self, obj):
        """Return basic details about the related page."""
        related = obj.related_page
        return {
            "id": str(related.id),
            "name": related.name,
            "page_type": related.page_type,
            "sequence_id": related.sequence_id,
            "state_id": str(related.state_id) if related.state_id else None,
            "logo_props": related.logo_props,
        }


class PageLinkSerializer(BaseSerializer):
    """Serializer for PageLink model."""

    class Meta:
        model = PageLink
        fields = [
            "id",
            "page",
            "title",
            "url",
            "metadata",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["workspace"]


# === Extended WikiPage Serializers for Unified Model ===


class WikiPageUnifiedSerializer(WikiPageSerializer):
    """
    Extended WikiPage serializer with unified model fields.
    Includes page_type, state, labels, assignees, and properties.
    """

    state_detail = serializers.SerializerMethodField()
    label_ids = serializers.SerializerMethodField()
    assignee_ids = serializers.SerializerMethodField()
    properties = serializers.SerializerMethodField()

    class Meta(WikiPageSerializer.Meta):
        fields = WikiPageSerializer.Meta.fields + [
            "page_type",
            "sequence_id",
            "state",
            "state_detail",
            "completed_at",
            "label_ids",
            "assignee_ids",
            "properties",
        ]

    def get_state_detail(self, obj):
        """Return state details if set."""
        if not obj.state:
            return None
        return {
            "id": str(obj.state.id),
            "name": obj.state.name,
            "color": obj.state.color,
            "group": obj.state.group,
        }

    def get_label_ids(self, obj):
        """Return list of label IDs."""
        return list(
            obj.page_labels.filter(deleted_at__isnull=True).values_list("label_id", flat=True)
        )

    def get_assignee_ids(self, obj):
        """Return list of assignee IDs."""
        return list(
            obj.page_assignees.filter(deleted_at__isnull=True).values_list("assignee_id", flat=True)
        )

    def get_properties(self, obj):
        """Return property values for this page."""
        prop_values = obj.property_values.filter(deleted_at__isnull=True).select_related("property")
        result = {}
        for pv in prop_values:
            prop_type = pv.property.property_type
            if prop_type == "text":
                value = pv.value_text
            elif prop_type == "number":
                value = float(pv.value_number) if pv.value_number else None
            elif prop_type == "date":
                value = str(pv.value_date) if pv.value_date else None
            elif prop_type == "checkbox":
                value = pv.value_boolean
            else:
                value = pv.value_json
            result[pv.property.slug] = {
                "id": str(pv.id),
                "property_id": str(pv.property_id),
                "value": value,
            }
        return result


class WikiPageUnifiedDetailSerializer(WikiPageUnifiedSerializer):
    """Detailed unified page serializer with full content."""

    description_html = serializers.CharField(read_only=True)
    shares = WikiPageShareSerializer(many=True, read_only=True)
    label_details = serializers.SerializerMethodField()
    assignee_details = serializers.SerializerMethodField()

    class Meta(WikiPageUnifiedSerializer.Meta):
        fields = WikiPageUnifiedSerializer.Meta.fields + [
            "description_html",
            "shares",
            "label_details",
            "assignee_details",
        ]

    def get_label_details(self, obj):
        """Return label details."""
        labels = Label.objects.filter(
            id__in=obj.page_labels.filter(deleted_at__isnull=True).values_list("label_id", flat=True)
        )
        return [
            {
                "id": str(label.id),
                "name": label.name,
                "color": label.color,
            }
            for label in labels
        ]

    def get_assignee_details(self, obj):
        """Return assignee details."""
        assignees = User.objects.filter(
            id__in=obj.page_assignees.filter(deleted_at__isnull=True).values_list("assignee_id", flat=True)
        )
        return [
            {
                "id": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "avatar": user.avatar,
            }
            for user in assignees
        ]

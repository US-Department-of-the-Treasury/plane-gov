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
    DocumentCollection,
    Document,
    DocumentShare,
    DocumentVersion,
    DocumentAccessLog,
    DocumentLabel,
    DocumentAssignee,
    DocumentComment,
    DocumentCommentReaction,
    DocumentActivity,
    DocumentSubscriber,
    DocumentMention,
    DocumentRelation,
    DocumentRelationChoices,
    DocumentLink,
    PropertyDefinition,
    DocumentPropertyValue,
    User,
    Label,
    State,
)


class DocumentCollectionSerializer(BaseSerializer):
    """Serializer for DocumentCollection model."""

    child_count = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = DocumentCollection
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
            "document_count",
        ]
        read_only_fields = ["workspace", "created_by", "updated_by"]

    def get_child_count(self, obj):
        """Return count of child collections."""
        return obj.child_collections.filter(deleted_at__isnull=True).count()

    def get_document_count(self, obj):
        """Return count of documents in this collection."""
        return obj.documents.filter(deleted_at__isnull=True).count()


class DocumentCollectionLiteSerializer(BaseSerializer):
    """Lightweight serializer for DocumentCollection references."""

    class Meta:
        model = DocumentCollection
        fields = [
            "id",
            "name",
            "icon",
            "parent",
        ]


class DocumentShareSerializer(BaseSerializer):
    """Serializer for DocumentShare model."""

    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = DocumentShare
        fields = [
            "id",
            "document",
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


class DocumentSerializer(BaseSerializer):
    """Serializer for Document model."""

    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    collection_detail = DocumentCollectionLiteSerializer(source="collection", read_only=True)
    child_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
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
            # Unified document model fields
            "document_type",
            "sequence_id",
            "state",
            "completed_at",
        ]
        read_only_fields = ["workspace", "owned_by", "created_by", "updated_by"]

    def get_is_owner(self, obj):
        """Check if current user is the document owner."""
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            return obj.owned_by_id == request.user.id
        return False

    def get_can_edit(self, obj):
        """Check if current user can edit the document."""
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return False

        user = request.user

        # Owner can always edit
        if obj.owned_by_id == user.id:
            return True

        # Check if user has edit or admin permission via share
        if obj.access == Document.SHARED_ACCESS:
            share = obj.shares.filter(
                user=user,
                deleted_at__isnull=True,
                permission__in=[
                    DocumentShare.EDIT_PERMISSION,
                    DocumentShare.ADMIN_PERMISSION,
                ],
            ).first()
            return share is not None

        return False

    def get_child_count(self, obj):
        """Return count of child documents."""
        return obj.child_documents.filter(deleted_at__isnull=True).count()

    def create(self, validated_data):
        workspace_id = self.context["workspace_id"]
        owned_by_id = self.context["owned_by_id"]
        project_id = self.context.get("project_id")
        description = self.context.get("description", {})
        description_binary = self.context.get("description_binary")
        description_html = self.context.get("description_html", "<p></p>")

        return Document.objects.create(
            **validated_data,
            workspace_id=workspace_id,
            owned_by_id=owned_by_id,
            project_id=project_id,
            description=description,
            description_binary=description_binary,
            description_html=description_html,
        )


class DocumentDetailSerializer(DocumentSerializer):
    """Serializer with full document content."""

    description_html = serializers.CharField(read_only=True)
    shares = DocumentShareSerializer(many=True, read_only=True)

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + ["description_html", "shares"]


class DocumentLiteSerializer(BaseSerializer):
    """Lightweight serializer for Document references."""

    class Meta:
        model = Document
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


class DocumentVersionSerializer(BaseSerializer):
    """Serializer for DocumentVersion model."""

    class Meta:
        model = DocumentVersion
        fields = [
            "id",
            "workspace",
            "document",
            "last_saved_at",
            "owned_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["workspace", "document"]


class DocumentVersionDetailSerializer(BaseSerializer):
    """Serializer with version content for restore/diff."""

    class Meta:
        model = DocumentVersion
        fields = [
            "id",
            "workspace",
            "document",
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
        read_only_fields = ["workspace", "document"]


class DocumentAccessLogSerializer(BaseSerializer):
    """Serializer for DocumentAccessLog model."""

    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = DocumentAccessLog
        fields = [
            "id",
            "document",
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


class DocumentBinaryUpdateSerializer(serializers.Serializer):
    """Serializer for updating document binary description with validation."""

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
        """Update the document instance with validated data."""
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
            "document_types",
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


class DocumentPropertyValueSerializer(BaseSerializer):
    """Serializer for DocumentPropertyValue model."""

    property_detail = PropertyDefinitionLiteSerializer(source="property", read_only=True)

    class Meta:
        model = DocumentPropertyValue
        fields = [
            "id",
            "document",
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


class DocumentCommentReactionSerializer(BaseSerializer):
    """Serializer for DocumentCommentReaction model."""

    actor_detail = serializers.SerializerMethodField()

    class Meta:
        model = DocumentCommentReaction
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


class DocumentCommentSerializer(BaseSerializer):
    """Serializer for DocumentComment model."""

    actor_detail = serializers.SerializerMethodField()
    reactions = DocumentCommentReactionSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = DocumentComment
        fields = [
            "id",
            "document",
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


class DocumentActivitySerializer(BaseSerializer):
    """Serializer for DocumentActivity model."""

    actor_detail = serializers.SerializerMethodField()

    class Meta:
        model = DocumentActivity
        fields = [
            "id",
            "document",
            "verb",
            "field",
            "old_value",
            "new_value",
            "comment",
            "attachments",
            "document_comment",
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


class DocumentSubscriberSerializer(BaseSerializer):
    """Serializer for DocumentSubscriber model."""

    subscriber_detail = serializers.SerializerMethodField()

    class Meta:
        model = DocumentSubscriber
        fields = [
            "id",
            "document",
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


class DocumentMentionSerializer(BaseSerializer):
    """Serializer for DocumentMention model."""

    mentioned_user_detail = serializers.SerializerMethodField()

    class Meta:
        model = DocumentMention
        fields = [
            "id",
            "document",
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


class DocumentRelationSerializer(BaseSerializer):
    """Serializer for DocumentRelation model."""

    related_document_detail = serializers.SerializerMethodField()

    class Meta:
        model = DocumentRelation
        fields = [
            "id",
            "document",
            "related_document",
            "relation_type",
            "workspace",
            "created_at",
            "updated_at",
            "related_document_detail",
        ]
        read_only_fields = ["workspace"]

    def get_related_document_detail(self, obj):
        """Return basic details about the related document."""
        related = obj.related_document
        return {
            "id": str(related.id),
            "name": related.name,
            "document_type": related.document_type,
            "sequence_id": related.sequence_id,
            "state_id": str(related.state_id) if related.state_id else None,
            "logo_props": related.logo_props,
        }


class DocumentLinkSerializer(BaseSerializer):
    """Serializer for DocumentLink model."""

    class Meta:
        model = DocumentLink
        fields = [
            "id",
            "document",
            "title",
            "url",
            "metadata",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["workspace"]


# === Extended Document Serializers for Unified Model ===


class DocumentUnifiedSerializer(DocumentSerializer):
    """
    Extended Document serializer with unified model fields.
    Includes document_type, state, labels, assignees, and properties.
    """

    state_detail = serializers.SerializerMethodField()
    label_ids = serializers.SerializerMethodField()
    assignee_ids = serializers.SerializerMethodField()
    properties = serializers.SerializerMethodField()

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + [
            "document_type",
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
            obj.document_labels.filter(deleted_at__isnull=True).values_list("label_id", flat=True)
        )

    def get_assignee_ids(self, obj):
        """Return list of assignee IDs."""
        return list(
            obj.document_assignees.filter(deleted_at__isnull=True).values_list("assignee_id", flat=True)
        )

    def get_properties(self, obj):
        """Return property values for this document."""
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


class DocumentUnifiedDetailSerializer(DocumentUnifiedSerializer):
    """Detailed unified document serializer with full content."""

    description_html = serializers.CharField(read_only=True)
    shares = DocumentShareSerializer(many=True, read_only=True)
    label_details = serializers.SerializerMethodField()
    assignee_details = serializers.SerializerMethodField()

    class Meta(DocumentUnifiedSerializer.Meta):
        fields = DocumentUnifiedSerializer.Meta.fields + [
            "description_html",
            "shares",
            "label_details",
            "assignee_details",
        ]

    def get_label_details(self, obj):
        """Return label details."""
        labels = Label.objects.filter(
            id__in=obj.document_labels.filter(deleted_at__isnull=True).values_list("label_id", flat=True)
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
            id__in=obj.document_assignees.filter(deleted_at__isnull=True).values_list("assignee_id", flat=True)
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

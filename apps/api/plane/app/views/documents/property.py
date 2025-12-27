# Django imports
from django.utils.text import slugify

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import DocumentPermission, WorkSpaceAdminPermission
from plane.app.serializers import (
    PropertyDefinitionSerializer,
    DocumentPropertyValueSerializer,
)
from plane.db.models import (
    Document,
    PropertyDefinition,
    DocumentPropertyValue,
    DocumentActivity,
    Workspace,
    WorkspaceMember,
)

# Local imports
from ..base import BaseViewSet


class PropertyDefinitionViewSet(BaseViewSet):
    """
    ViewSet for managing property definitions.
    Property definitions are workspace-scoped schemas for document properties.
    """

    serializer_class = PropertyDefinitionSerializer
    model = PropertyDefinition
    permission_classes = [WorkSpaceAdminPermission]

    def get_queryset(self):
        slug = self.kwargs.get("slug")
        return (
            PropertyDefinition.objects.filter(
                workspace__slug=slug,
                deleted_at__isnull=True,
            )
            .select_related("workspace")
            .order_by("sort_order", "name")
        )

    def list(self, request, slug):
        queryset = self.get_queryset()

        # Filter by document_type if provided
        document_type = request.query_params.get("document_type")
        if document_type:
            # Include properties with empty document_types (apply to all) or matching document_type
            queryset = queryset.filter(
                models.Q(document_types=[]) | models.Q(document_types__contains=[document_type])
            )

        # Filter by is_system
        is_system = request.query_params.get("is_system")
        if is_system is not None:
            queryset = queryset.filter(is_system=is_system.lower() == "true")

        serializer = PropertyDefinitionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        name = request.data.get("name")
        if not name:
            return Response({"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Generate slug from name
        base_slug = slugify(name)
        prop_slug = base_slug
        counter = 1
        while PropertyDefinition.objects.filter(
            workspace=workspace,
            slug=prop_slug,
            deleted_at__isnull=True,
        ).exists():
            prop_slug = f"{base_slug}-{counter}"
            counter += 1

        serializer = PropertyDefinitionSerializer(data=request.data)
        if serializer.is_valid():
            prop = serializer.save(
                workspace=workspace,
                slug=prop_slug,
                is_system=False,  # User-created properties are never system
                created_by=request.user,
                updated_by=request.user,
            )
            return Response(PropertyDefinitionSerializer(prop).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, slug, pk):
        prop = self.get_queryset().filter(pk=pk).first()
        if not prop:
            return Response({"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(PropertyDefinitionSerializer(prop).data, status=status.HTTP_200_OK)

    def partial_update(self, request, slug, pk):
        prop = self.get_queryset().filter(pk=pk).first()
        if not prop:
            return Response({"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND)

        # System properties have limited editable fields
        if prop.is_system:
            allowed_fields = {"is_hidden", "sort_order"}
            disallowed = set(request.data.keys()) - allowed_fields
            if disallowed:
                return Response(
                    {"error": f"Cannot modify {disallowed} on system properties"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = PropertyDefinitionSerializer(prop, data=request.data, partial=True)
        if serializer.is_valid():
            prop = serializer.save(updated_by=request.user)
            return Response(PropertyDefinitionSerializer(prop).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, pk):
        prop = self.get_queryset().filter(pk=pk).first()
        if not prop:
            return Response({"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND)

        if prop.is_system:
            return Response(
                {"error": "Cannot delete system properties"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Delete all property values first
        DocumentPropertyValue.objects.filter(property=prop).delete()

        prop.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentPropertyValueViewSet(BaseViewSet):
    """
    ViewSet for managing property values on documents.
    """

    serializer_class = DocumentPropertyValueSerializer
    model = DocumentPropertyValue
    permission_classes = [DocumentPermission]

    def get_document(self, slug, document_id):
        """Get the document and verify access."""
        user = self.request.user

        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = Document.objects.filter(
            pk=document_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        if is_admin:
            return base_query.first()

        return base_query.filter(owned_by=user).first()

    def get_queryset(self):
        document_id = self.kwargs.get("document_id")
        slug = self.kwargs.get("slug")

        return (
            DocumentPropertyValue.objects.filter(
                document_id=document_id,
                document__workspace__slug=slug,
                deleted_at__isnull=True,
            )
            .select_related("property")
            .order_by("property__sort_order")
        )

    def list(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        serializer = DocumentPropertyValueSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        property_id = request.data.get("property")
        if not property_id:
            return Response(
                {"error": "property is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify property exists in workspace
        prop = PropertyDefinition.objects.filter(
            pk=property_id,
            workspace=document.workspace,
            deleted_at__isnull=True,
        ).first()

        if not prop:
            return Response(
                {"error": "Property not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check document_type restrictions
        if prop.document_types and document.document_type not in prop.document_types:
            return Response(
                {"error": f"Property '{prop.name}' is not available for document type '{document.document_type}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if value already exists
        existing = DocumentPropertyValue.objects.filter(
            document=document,
            property=prop,
            deleted_at__isnull=True,
        ).first()

        if existing:
            # Update existing value
            return self._update_property_value(request, document, prop, existing)

        # Create new value
        return self._create_property_value(request, document, prop)

    def _create_property_value(self, request, document, prop):
        """Create a new property value."""
        value_data = self._extract_value_data(request.data, prop)

        pv = DocumentPropertyValue.objects.create(
            document=document,
            property=prop,
            workspace=document.workspace,
            created_by=request.user,
            updated_by=request.user,
            **value_data,
        )

        # Log activity
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="property_created",
            field=prop.slug,
            new_value=str(request.data.get("value")),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            DocumentPropertyValueSerializer(pv).data,
            status=status.HTTP_201_CREATED,
        )

    def _update_property_value(self, request, document, prop, existing):
        """Update an existing property value."""
        old_value = self._get_current_value(existing, prop)
        value_data = self._extract_value_data(request.data, prop)

        for key, value in value_data.items():
            setattr(existing, key, value)
        existing.updated_by = request.user
        existing.save()

        # Log activity
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="property_updated",
            field=prop.slug,
            old_value=str(old_value),
            new_value=str(request.data.get("value")),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            DocumentPropertyValueSerializer(existing).data,
            status=status.HTTP_200_OK,
        )

    def _extract_value_data(self, data, prop):
        """Extract typed value from request data based on property type."""
        value = data.get("value")
        prop_type = prop.property_type

        value_data = {
            "value_text": None,
            "value_number": None,
            "value_date": None,
            "value_datetime": None,
            "value_boolean": None,
            "value_json": None,
        }

        if prop_type == "text" or prop_type == "url":
            value_data["value_text"] = value
        elif prop_type == "number":
            value_data["value_number"] = value
        elif prop_type == "date":
            value_data["value_date"] = value
        elif prop_type == "checkbox":
            value_data["value_boolean"] = value
        else:
            # select, multi_select, user, multi_user, relation
            value_data["value_json"] = value

        return value_data

    def _get_current_value(self, pv, prop):
        """Get current value based on property type."""
        prop_type = prop.property_type
        if prop_type == "text" or prop_type == "url":
            return pv.value_text
        elif prop_type == "number":
            return pv.value_number
        elif prop_type == "date":
            return pv.value_date
        elif prop_type == "checkbox":
            return pv.value_boolean
        else:
            return pv.value_json

    def partial_update(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        pv = self.get_queryset().filter(pk=pk).first()
        if not pv:
            return Response({"error": "Property value not found"}, status=status.HTTP_404_NOT_FOUND)

        old_value = self._get_current_value(pv, pv.property)
        value_data = self._extract_value_data(request.data, pv.property)

        for key, value in value_data.items():
            setattr(pv, key, value)
        pv.updated_by = request.user
        pv.save()

        # Log activity
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="property_updated",
            field=pv.property.slug,
            old_value=str(old_value),
            new_value=str(request.data.get("value")),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            DocumentPropertyValueSerializer(pv).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        pv = self.get_queryset().filter(pk=pk).first()
        if not pv:
            return Response({"error": "Property value not found"}, status=status.HTTP_404_NOT_FOUND)

        # Log activity
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="property_deleted",
            field=pv.property.slug,
            old_value=str(self._get_current_value(pv, pv.property)),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        pv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BulkDocumentPropertyValueViewSet(BaseViewSet):
    """
    ViewSet for bulk updating property values on a document.
    Allows setting multiple properties in a single request.
    """

    permission_classes = [DocumentPermission]

    def get_document(self, slug, document_id):
        """Get the document and verify access."""
        user = self.request.user

        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = Document.objects.filter(
            pk=document_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        if is_admin:
            return base_query.first()

        return base_query.filter(owned_by=user).first()

    def create(self, request, slug, document_id):
        """
        Bulk update properties.
        Expects: { "properties": { "slug_or_id": value, ... } }
        """
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        properties = request.data.get("properties", {})
        if not properties:
            return Response(
                {"error": "properties dict is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace = document.workspace
        results = {}

        for prop_key, value in properties.items():
            # Try to find property by slug or ID
            prop = PropertyDefinition.objects.filter(
                workspace=workspace,
                deleted_at__isnull=True,
            ).filter(
                models.Q(slug=prop_key) | models.Q(pk=prop_key)
            ).first()

            if not prop:
                results[prop_key] = {"error": "Property not found"}
                continue

            # Check document_type restrictions
            if prop.document_types and document.document_type not in prop.document_types:
                results[prop_key] = {"error": f"Not available for document type '{document.document_type}'"}
                continue

            # Get or create property value
            pv, created = DocumentPropertyValue.objects.get_or_create(
                document=document,
                property=prop,
                deleted_at__isnull=True,
                defaults={
                    "workspace": workspace,
                    "created_by": request.user,
                    "updated_by": request.user,
                }
            )

            # Extract and set value
            prop_type = prop.property_type
            if prop_type == "text" or prop_type == "url":
                pv.value_text = value
            elif prop_type == "number":
                pv.value_number = value
            elif prop_type == "date":
                pv.value_date = value
            elif prop_type == "checkbox":
                pv.value_boolean = value
            else:
                pv.value_json = value

            pv.updated_by = request.user
            pv.save()

            results[prop_key] = DocumentPropertyValueSerializer(pv).data

        return Response(results, status=status.HTTP_200_OK)


# Import models at module level to avoid import issues
from django.db import models

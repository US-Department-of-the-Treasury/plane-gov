# Django imports
from django.utils.text import slugify

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import WikiPagePermission, WorkSpaceAdminPermission
from plane.app.serializers import (
    PropertyDefinitionSerializer,
    PagePropertyValueSerializer,
)
from plane.db.models import (
    WikiPage,
    PropertyDefinition,
    PagePropertyValue,
    PageActivity,
    Workspace,
    WorkspaceMember,
)

# Local imports
from ..base import BaseViewSet


class PropertyDefinitionViewSet(BaseViewSet):
    """
    ViewSet for managing property definitions.
    Property definitions are workspace-scoped schemas for page properties.
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

        # Filter by page_type if provided
        page_type = request.query_params.get("page_type")
        if page_type:
            # Include properties with empty page_types (apply to all) or matching page_type
            queryset = queryset.filter(
                models.Q(page_types=[]) | models.Q(page_types__contains=[page_type])
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
        PagePropertyValue.objects.filter(property=prop).delete()

        prop.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PagePropertyValueViewSet(BaseViewSet):
    """
    ViewSet for managing property values on pages.
    """

    serializer_class = PagePropertyValueSerializer
    model = PagePropertyValue
    permission_classes = [WikiPagePermission]

    def get_page(self, slug, page_id):
        """Get the page and verify access."""
        user = self.request.user

        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = WikiPage.objects.filter(
            pk=page_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        if is_admin:
            return base_query.first()

        return base_query.filter(owned_by=user).first()

    def get_queryset(self):
        page_id = self.kwargs.get("page_id")
        slug = self.kwargs.get("slug")

        return (
            PagePropertyValue.objects.filter(
                page_id=page_id,
                page__workspace__slug=slug,
                deleted_at__isnull=True,
            )
            .select_related("property")
            .order_by("property__sort_order")
        )

    def list(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        serializer = PagePropertyValueSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        property_id = request.data.get("property")
        if not property_id:
            return Response(
                {"error": "property is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify property exists in workspace
        prop = PropertyDefinition.objects.filter(
            pk=property_id,
            workspace=page.workspace,
            deleted_at__isnull=True,
        ).first()

        if not prop:
            return Response(
                {"error": "Property not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check page_type restrictions
        if prop.page_types and page.page_type not in prop.page_types:
            return Response(
                {"error": f"Property '{prop.name}' is not available for page type '{page.page_type}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if value already exists
        existing = PagePropertyValue.objects.filter(
            page=page,
            property=prop,
            deleted_at__isnull=True,
        ).first()

        if existing:
            # Update existing value
            return self._update_property_value(request, page, prop, existing)

        # Create new value
        return self._create_property_value(request, page, prop)

    def _create_property_value(self, request, page, prop):
        """Create a new property value."""
        value_data = self._extract_value_data(request.data, prop)

        pv = PagePropertyValue.objects.create(
            page=page,
            property=prop,
            workspace=page.workspace,
            created_by=request.user,
            updated_by=request.user,
            **value_data,
        )

        # Log activity
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="property_created",
            field=prop.slug,
            new_value=str(request.data.get("value")),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            PagePropertyValueSerializer(pv).data,
            status=status.HTTP_201_CREATED,
        )

    def _update_property_value(self, request, page, prop, existing):
        """Update an existing property value."""
        old_value = self._get_current_value(existing, prop)
        value_data = self._extract_value_data(request.data, prop)

        for key, value in value_data.items():
            setattr(existing, key, value)
        existing.updated_by = request.user
        existing.save()

        # Log activity
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="property_updated",
            field=prop.slug,
            old_value=str(old_value),
            new_value=str(request.data.get("value")),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            PagePropertyValueSerializer(existing).data,
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

    def partial_update(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

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
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="property_updated",
            field=pv.property.slug,
            old_value=str(old_value),
            new_value=str(request.data.get("value")),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            PagePropertyValueSerializer(pv).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        pv = self.get_queryset().filter(pk=pk).first()
        if not pv:
            return Response({"error": "Property value not found"}, status=status.HTTP_404_NOT_FOUND)

        # Log activity
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="property_deleted",
            field=pv.property.slug,
            old_value=str(self._get_current_value(pv, pv.property)),
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        pv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BulkPagePropertyValueViewSet(BaseViewSet):
    """
    ViewSet for bulk updating property values on a page.
    Allows setting multiple properties in a single request.
    """

    permission_classes = [WikiPagePermission]

    def get_page(self, slug, page_id):
        """Get the page and verify access."""
        user = self.request.user

        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = WikiPage.objects.filter(
            pk=page_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        if is_admin:
            return base_query.first()

        return base_query.filter(owned_by=user).first()

    def create(self, request, slug, page_id):
        """
        Bulk update properties.
        Expects: { "properties": { "slug_or_id": value, ... } }
        """
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        properties = request.data.get("properties", {})
        if not properties:
            return Response(
                {"error": "properties dict is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace = page.workspace
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

            # Check page_type restrictions
            if prop.page_types and page.page_type not in prop.page_types:
                results[prop_key] = {"error": f"Not available for page type '{page.page_type}'"}
                continue

            # Get or create property value
            pv, created = PagePropertyValue.objects.get_or_create(
                page=page,
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

            results[prop_key] = PagePropertyValueSerializer(pv).data

        return Response(results, status=status.HTTP_200_OK)


# Import models at module level to avoid import issues
from django.db import models

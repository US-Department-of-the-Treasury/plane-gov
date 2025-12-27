# Django imports
from django.db.models import Q

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import WikiPagePermission
from plane.app.serializers import PageRelationSerializer, PageLinkSerializer
from plane.db.models import (
    WikiPage,
    PageRelation,
    PageRelationChoices,
    PageLink,
    PageActivity,
    Workspace,
    WorkspaceMember,
)

# Local imports
from ..base import BaseViewSet


class PageRelationViewSet(BaseViewSet):
    """
    ViewSet for managing page-to-page relations.
    For issue-type pages, this replaces IssueRelation functionality.
    """

    serializer_class = PageRelationSerializer
    model = PageRelation
    permission_classes = [WikiPagePermission]

    def get_page(self, slug, page_id):
        """Get the page and verify access."""
        user = self.request.user

        # Check if user is admin
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

        # Regular users can access their own pages
        return base_query.filter(owned_by=user).first()

    def get_queryset(self):
        page_id = self.kwargs.get("page_id")
        slug = self.kwargs.get("slug")

        # Get both forward and reverse relations
        return (
            PageRelation.objects.filter(
                Q(page_id=page_id) | Q(related_page_id=page_id),
                workspace__slug=slug,
                deleted_at__isnull=True,
            )
            .select_related("page", "related_page")
            .order_by("-created_at")
        )

    def list(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()

        # Organize relations by type
        relations = {
            "blocking": [],
            "blocked_by": [],
            "relates_to": [],
            "duplicate": [],
            "start_before": [],
            "start_after": [],
            "finish_before": [],
            "finish_after": [],
            "implemented_by": [],
            "implements": [],
        }

        for rel in queryset:
            if str(rel.page_id) == str(page_id):
                # Forward relation
                rel_type = rel.relation_type
                relations[rel_type].append(
                    PageRelationSerializer(rel, context={"request": request}).data
                )
            else:
                # Reverse relation - map to reverse type
                reverse_type = PageRelationChoices._REVERSE_MAPPING.get(
                    rel.relation_type, rel.relation_type
                )
                # Swap page and related_page for the response
                rel_data = PageRelationSerializer(rel, context={"request": request}).data
                # Swap IDs in response so "related_page" is always the other page
                rel_data["related_page"] = str(rel.page_id)
                rel_data["related_page_detail"] = {
                    "id": str(rel.page.id),
                    "name": rel.page.name,
                    "page_type": rel.page.page_type,
                    "sequence_id": rel.page.sequence_id,
                    "state_id": str(rel.page.state_id) if rel.page.state_id else None,
                    "logo_props": rel.page.logo_props,
                }
                relations[reverse_type].append(rel_data)

        return Response(relations, status=status.HTTP_200_OK)

    def create(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        related_page_id = request.data.get("related_page")
        relation_type = request.data.get("relation_type", PageRelationChoices.BLOCKED_BY)

        if not related_page_id:
            return Response(
                {"error": "related_page is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(related_page_id) == str(page_id):
            return Response(
                {"error": "Cannot create relation to self"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify related page exists
        related_page = WikiPage.objects.filter(
            pk=related_page_id,
            workspace=page.workspace,
            deleted_at__isnull=True,
        ).first()

        if not related_page:
            return Response(
                {"error": "Related page not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if relation already exists (in either direction)
        existing = PageRelation.objects.filter(
            Q(page_id=page_id, related_page_id=related_page_id)
            | Q(page_id=related_page_id, related_page_id=page_id),
            deleted_at__isnull=True,
        ).first()

        if existing:
            return Response(
                {"error": "Relation already exists between these pages"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create relation
        relation = PageRelation.objects.create(
            page=page,
            related_page=related_page,
            relation_type=relation_type,
            workspace=page.workspace,
            created_by=request.user,
            updated_by=request.user,
        )

        # Log activity
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="relation_created",
            field="relation",
            new_value=f"{relation_type}: {related_page.name}",
            new_identifier=related_page.id,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            PageRelationSerializer(relation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        relation = PageRelation.objects.filter(
            Q(pk=pk),
            Q(page_id=page_id) | Q(related_page_id=page_id),
            deleted_at__isnull=True,
        ).first()

        if not relation:
            return Response({"error": "Relation not found"}, status=status.HTTP_404_NOT_FOUND)

        # Log activity
        other_page = relation.related_page if str(relation.page_id) == str(page_id) else relation.page
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="relation_deleted",
            field="relation",
            old_value=f"{relation.relation_type}: {other_page.name}",
            old_identifier=other_page.id,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        relation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PageLinkViewSet(BaseViewSet):
    """
    ViewSet for managing external links attached to pages.
    For issue-type pages, this replaces IssueLink functionality.
    """

    serializer_class = PageLinkSerializer
    model = PageLink
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

        return PageLink.objects.filter(
            page_id=page_id,
            page__workspace__slug=slug,
            deleted_at__isnull=True,
        ).order_by("-created_at")

    def list(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        serializer = PageLinkSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        url = request.data.get("url")
        if not url:
            return Response({"error": "url is required"}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get("title", "")
        metadata = request.data.get("metadata", {})

        link = PageLink.objects.create(
            page=page,
            url=url,
            title=title,
            metadata=metadata,
            workspace=page.workspace,
            created_by=request.user,
            updated_by=request.user,
        )

        # Log activity
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="link_created",
            field="link",
            new_value=url,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(PageLinkSerializer(link).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        link = self.get_queryset().filter(pk=pk).first()
        if not link:
            return Response({"error": "Link not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = PageLinkSerializer(link, data=request.data, partial=True)
        if serializer.is_valid():
            link = serializer.save(updated_by=request.user)
            return Response(PageLinkSerializer(link).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        link = self.get_queryset().filter(pk=pk).first()
        if not link:
            return Response({"error": "Link not found"}, status=status.HTTP_404_NOT_FOUND)

        # Log activity
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="link_deleted",
            field="link",
            old_value=link.url,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

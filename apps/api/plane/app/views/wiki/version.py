# Third party imports
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action

# Package imports
from plane.app.permissions import WikiPagePermission
from plane.app.serializers import WikiPageVersionSerializer, WikiPageVersionDetailSerializer
from plane.db.models import WikiPage, WikiPageVersion, WikiPageShare, WikiPageAccessLog, WorkspaceMember
from django.db.models import Q

# Local imports
from ..base import BaseViewSet
from .page import log_wiki_access


class WikiPageVersionViewSet(BaseViewSet):
    """
    ViewSet for wiki page version history.
    Supports listing versions and restoring to a previous version.
    """

    serializer_class = WikiPageVersionSerializer
    model = WikiPageVersion
    permission_classes = [WikiPagePermission]

    def get_page(self, slug, page_id):
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

        # Check access
        shared_pages = WikiPageShare.objects.filter(
            user=user,
            deleted_at__isnull=True,
        ).values_list("page_id", flat=True)

        return base_query.filter(
            Q(owned_by=user) | Q(id__in=shared_pages)
        ).first()

    def get_queryset(self):
        return WikiPageVersion.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            page_id=self.kwargs.get("page_id"),
            deleted_at__isnull=True,
        ).select_related("owned_by", "created_by").order_by("-created_at")

    def list(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        versions = self.get_queryset()

        # Pagination
        limit = int(request.query_params.get("limit", 20))
        offset = int(request.query_params.get("offset", 0))

        total = versions.count()
        versions = versions[offset : offset + limit]

        serializer = WikiPageVersionSerializer(versions, many=True)
        return Response(
            {
                "results": serializer.data,
                "count": total,
                "next_offset": offset + limit if offset + limit < total else None,
            },
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        version = self.get_queryset().filter(pk=pk).first()
        if not version:
            return Response({"error": "Version not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = WikiPageVersionDetailSerializer(version)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def restore(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check edit permission
        if page.owned_by_id != request.user.id:
            share = WikiPageShare.objects.filter(
                page=page,
                user=request.user,
                permission__in=[WikiPageShare.EDIT_PERMISSION, WikiPageShare.ADMIN_PERMISSION],
                deleted_at__isnull=True,
            ).first()

            if not share:
                return Response(
                    {"error": "You don't have permission to restore this page"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        version = self.get_queryset().filter(pk=pk).first()
        if not version:
            return Response({"error": "Version not found"}, status=status.HTTP_404_NOT_FOUND)

        # Create a new version with current state before restoring
        WikiPageVersion.objects.create(
            workspace=page.workspace,
            page=page,
            owned_by=request.user,
            description_binary=page.description_binary,
            description_html=page.description_html,
            description_json=page.description,
        )

        # Restore the page content
        page.description_binary = version.description_binary
        page.description_html = version.description_html
        page.description = version.description_json
        page.save(update_fields=["description_binary", "description_html", "description"])

        log_wiki_access(
            page, request.user, WikiPageAccessLog.ACCESS_TYPE_EDIT, request,
            {"action": "restore", "restored_version_id": str(pk)}
        )

        return Response({"message": "Version restored successfully"}, status=status.HTTP_200_OK)

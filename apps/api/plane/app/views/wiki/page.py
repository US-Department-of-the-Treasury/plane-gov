# Python imports
import json
from datetime import datetime
from django.core.serializers.json import DjangoJSONEncoder

# Django imports
from django.db import connection
from django.db.models import Q, Count, Exists, OuterRef
from django.http import StreamingHttpResponse

# Third party imports
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action

# Package imports
from plane.app.permissions import WikiPagePermission, WikiCollectionPermission, allow_permission, ROLE
from plane.app.serializers import (
    WikiPageSerializer,
    WikiPageDetailSerializer,
    WikiPageLiteSerializer,
    WikiPageBinaryUpdateSerializer,
)
from plane.db.models import (
    WikiPage,
    WikiPageShare,
    WikiPageVersion,
    WikiPageAccessLog,
    Workspace,
    WorkspaceMember,
)
from plane.utils.error_codes import ERROR_CODES

# Local imports
from ..base import BaseViewSet, BaseAPIView


def unarchive_archive_wiki_page_and_descendants(page_id, archived_at):
    """Archive or unarchive a wiki page and all its descendants."""
    sql = """
    WITH RECURSIVE descendants AS (
        SELECT id FROM wiki_pages WHERE id = %s
        UNION ALL
        SELECT wiki_pages.id FROM wiki_pages, descendants WHERE wiki_pages.parent_id = descendants.id
    )
    UPDATE wiki_pages SET archived_at = %s WHERE id IN (SELECT id FROM descendants);
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [page_id, archived_at])


def log_wiki_access(page, user, access_type, request, metadata=None):
    """Log access to a wiki page for audit compliance."""
    WikiPageAccessLog.objects.create(
        page=page,
        user=user,
        access_type=access_type,
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        workspace=page.workspace,
        metadata=metadata or {},
    )


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class WikiPageViewSet(BaseViewSet):
    """
    ViewSet for managing Wiki pages.
    Supports CRUD operations plus lock/unlock, archive/unarchive, and access control.
    """

    serializer_class = WikiPageSerializer
    model = WikiPage
    permission_classes = [WikiPagePermission]
    search_fields = ["name", "description_stripped"]

    def get_queryset(self):
        user = self.request.user
        slug = self.kwargs.get("slug")

        # Check if user is admin
        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,  # Admin
            is_active=True,
        ).exists()

        base_query = WikiPage.objects.filter(
            workspace__slug=slug,
            deleted_at__isnull=True,
        ).select_related(
            "workspace", "collection", "parent", "owned_by", "locked_by", "created_by"
        ).prefetch_related("shares")

        if is_admin:
            # Admins can see all pages
            return base_query.annotate(
                child_count=Count("child_pages", filter=Q(child_pages__deleted_at__isnull=True))
            ).order_by("sort_order", "-created_at")

        # Regular users can see:
        # 1. Pages they own
        # 2. Shared pages where they have access
        shared_pages = WikiPageShare.objects.filter(
            user=user,
            deleted_at__isnull=True,
        ).values_list("page_id", flat=True)

        return (
            base_query.filter(
                Q(owned_by=user) | Q(id__in=shared_pages)
            )
            .annotate(
                child_count=Count("child_pages", filter=Q(child_pages__deleted_at__isnull=True))
            )
            .order_by("sort_order", "-created_at")
        )

    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        serializer = WikiPageSerializer(
            data=request.data,
            context={
                "request": request,
                "workspace_id": workspace.id,
                "owned_by_id": request.user.id,
                "description": request.data.get("description", {}),
                "description_binary": request.data.get("description_binary"),
                "description_html": request.data.get("description_html", "<p></p>"),
            },
        )

        if serializer.is_valid():
            page = serializer.save()

            # Log creation
            log_wiki_access(
                page, request.user, WikiPageAccessLog.ACCESS_TYPE_EDIT, request,
                {"action": "create"}
            )

            return Response(
                WikiPageDetailSerializer(page, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, slug, pk):
        page = self.get_queryset().filter(pk=pk).first()

        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if this is an admin viewing a private page
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if page.access == WikiPage.PRIVATE_ACCESS and page.owned_by_id != request.user.id:
            if is_admin:
                # Log admin access to private page for audit
                log_wiki_access(
                    page, request.user, WikiPageAccessLog.ACCESS_TYPE_ADMIN_VIEW, request
                )
            else:
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Log normal view
            log_wiki_access(page, request.user, WikiPageAccessLog.ACCESS_TYPE_VIEW, request)

        serializer = WikiPageDetailSerializer(page, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, slug, pk):
        page = self.get_queryset().get(pk=pk)

        # Check ownership for access changes
        if (
            "access" in request.data
            and page.access != request.data.get("access")
            and page.owned_by_id != request.user.id
        ):
            return Response(
                {"error": "Only the owner can change access level"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate parent to prevent circular references
        parent_id = request.data.get("parent")
        if parent_id:
            if str(parent_id) == str(pk):
                return Response(
                    {"error": "Page cannot be its own parent"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = WikiPageDetailSerializer(page, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            log_wiki_access(
                page, request.user, WikiPageAccessLog.ACCESS_TYPE_EDIT, request,
                {"fields": list(request.data.keys())}
            )

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, slug):
        queryset = self.get_queryset()

        # Filter options
        collection = request.query_params.get("collection")
        parent = request.query_params.get("parent")
        access = request.query_params.get("access")
        archived = request.query_params.get("archived")
        owned_by_me = request.query_params.get("owned_by_me")

        if collection:
            if collection == "none":
                queryset = queryset.filter(collection__isnull=True)
            else:
                queryset = queryset.filter(collection_id=collection)

        if parent:
            if parent == "root":
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent)

        if access:
            queryset = queryset.filter(access=int(access))

        if archived == "true":
            queryset = queryset.filter(archived_at__isnull=False)
        elif archived == "false":
            queryset = queryset.filter(archived_at__isnull=True)

        if owned_by_me == "true":
            queryset = queryset.filter(owned_by=request.user)

        serializer = WikiPageSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, pk):
        page = self.get_queryset().get(pk=pk)

        # Must be archived before deleting
        if page.archived_at is None:
            return Response(
                {"error": "Page must be archived before deleting"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only owner or admin can delete
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if page.owned_by_id != request.user.id and not is_admin:
            return Response(
                {"error": "Only owner or admin can delete the page"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Remove parent from children
        WikiPage.objects.filter(
            parent=page,
            workspace__slug=slug,
            deleted_at__isnull=True,
        ).update(parent=None)

        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def lock(self, request, slug, pk):
        page = self.get_queryset().get(pk=pk)
        page.is_locked = True
        page.locked_by = request.user
        page.save(update_fields=["is_locked", "locked_by"])

        log_wiki_access(page, request.user, WikiPageAccessLog.ACCESS_TYPE_LOCK, request)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def unlock(self, request, slug, pk):
        page = self.get_queryset().get(pk=pk)
        page.is_locked = False
        page.locked_by = None
        page.save(update_fields=["is_locked", "locked_by"])

        log_wiki_access(page, request.user, WikiPageAccessLog.ACCESS_TYPE_UNLOCK, request)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def archive(self, request, slug, pk):
        page = self.get_queryset().get(pk=pk)

        # Only owner or admin can archive
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if page.owned_by_id != request.user.id and not is_admin:
            return Response(
                {"error": "Only owner or admin can archive the page"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unarchive_archive_wiki_page_and_descendants(pk, datetime.now().date())

        log_wiki_access(page, request.user, WikiPageAccessLog.ACCESS_TYPE_ARCHIVE, request)

        return Response({"archived_at": str(datetime.now().date())}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unarchive(self, request, slug, pk):
        page = self.get_queryset().get(pk=pk)

        # Only owner or admin can unarchive
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if page.owned_by_id != request.user.id and not is_admin:
            return Response(
                {"error": "Only owner or admin can unarchive the page"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If parent is archived, detach from parent
        if page.parent_id and page.parent.archived_at:
            page.parent = None
            page.save(update_fields=["parent"])

        unarchive_archive_wiki_page_and_descendants(pk, None)

        log_wiki_access(page, request.user, WikiPageAccessLog.ACCESS_TYPE_RESTORE, request)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, slug, pk):
        page = self.get_queryset().get(pk=pk)

        # Create a copy
        new_page = WikiPage.objects.create(
            workspace=page.workspace,
            collection=page.collection,
            parent=page.parent,
            name=f"{page.name} (Copy)",
            description=page.description,
            description_html=page.description_html,
            access=WikiPage.PRIVATE_ACCESS,  # Always start as private
            owned_by=request.user,
            logo_props=page.logo_props,
            view_props=page.view_props,
        )

        log_wiki_access(
            new_page, request.user, WikiPageAccessLog.ACCESS_TYPE_EDIT, request,
            {"action": "duplicate", "source_page_id": str(pk)}
        )

        serializer = WikiPageDetailSerializer(new_page, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WikiPageDescriptionViewSet(BaseViewSet):
    """ViewSet for binary description operations."""

    permission_classes = [WikiPagePermission]

    def get_page(self, slug, pk):
        user = self.request.user

        # Check if user is admin
        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = WikiPage.objects.filter(
            pk=pk,
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

    def retrieve(self, request, slug, pk):
        page = self.get_page(slug, pk)

        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        binary_data = page.description_binary

        def stream_data():
            if binary_data:
                yield binary_data
            else:
                yield b""

        response = StreamingHttpResponse(stream_data(), content_type="application/octet-stream")
        response["Content-Disposition"] = 'attachment; filename="wiki_page_description.bin"'
        return response

    def partial_update(self, request, slug, pk):
        page = self.get_page(slug, pk)

        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        if page.archived_at:
            return Response(
                {"error_code": ERROR_CODES.get("PAGE_ARCHIVED", 4001), "error_message": "PAGE_ARCHIVED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store existing state for version
        existing_instance = json.dumps(
            {"description_html": page.description_html}, cls=DjangoJSONEncoder
        )

        serializer = WikiPageBinaryUpdateSerializer(page, data=request.data, partial=True)
        if serializer.is_valid():
            updated_page = serializer.save()

            # Create version snapshot
            WikiPageVersion.objects.create(
                workspace=page.workspace,
                page=page,
                owned_by=request.user,
                description_binary=page.description_binary,
                description_html=page.description_html,
                description_json=page.description,
            )

            log_wiki_access(
                page, request.user, WikiPageAccessLog.ACCESS_TYPE_EDIT, request,
                {"action": "update_description"}
            )

            return Response({"message": "Updated successfully"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

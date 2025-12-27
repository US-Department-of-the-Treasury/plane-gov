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
from plane.app.permissions import DocumentPermission, DocumentCollectionPermission, allow_permission, ROLE
from plane.app.serializers import (
    DocumentSerializer,
    DocumentDetailSerializer,
    DocumentLiteSerializer,
    DocumentBinaryUpdateSerializer,
)
from plane.db.models import (
    Document,
    DocumentShare,
    DocumentVersion,
    DocumentAccessLog,
    Workspace,
    WorkspaceMember,
)
from plane.utils.error_codes import ERROR_CODES

# Local imports
from ..base import BaseViewSet, BaseAPIView


def unarchive_archive_document_and_descendants(document_id, archived_at):
    """Archive or unarchive a document and all its descendants."""
    sql = """
    WITH RECURSIVE descendants AS (
        SELECT id FROM documents WHERE id = %s
        UNION ALL
        SELECT documents.id FROM documents, descendants WHERE documents.parent_id = descendants.id
    )
    UPDATE documents SET archived_at = %s WHERE id IN (SELECT id FROM descendants);
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [document_id, archived_at])


def log_document_access(document, user, access_type, request, metadata=None):
    """Log access to a document for audit compliance."""
    DocumentAccessLog.objects.create(
        document=document,
        user=user,
        access_type=access_type,
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        workspace=document.workspace,
        metadata=metadata or {},
    )


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class DocumentViewSet(BaseViewSet):
    """
    ViewSet for managing Documents.
    Supports CRUD operations plus lock/unlock, archive/unarchive, and access control.
    """

    serializer_class = DocumentSerializer
    model = Document
    permission_classes = [DocumentPermission]
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

        base_query = Document.objects.filter(
            workspace__slug=slug,
            deleted_at__isnull=True,
        ).select_related(
            "workspace", "collection", "parent", "owned_by", "locked_by", "created_by"
        ).prefetch_related("shares")

        if is_admin:
            # Admins can see all documents
            return base_query.annotate(
                child_count=Count("child_documents", filter=Q(child_documents__deleted_at__isnull=True))
            ).order_by("sort_order", "-created_at")

        # Regular users can see:
        # 1. Documents they own
        # 2. Shared documents where they have access
        shared_documents = DocumentShare.objects.filter(
            user=user,
            deleted_at__isnull=True,
        ).values_list("document_id", flat=True)

        return (
            base_query.filter(
                Q(owned_by=user) | Q(id__in=shared_documents)
            )
            .annotate(
                child_count=Count("child_documents", filter=Q(child_documents__deleted_at__isnull=True))
            )
            .order_by("sort_order", "-created_at")
        )

    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        serializer = DocumentSerializer(
            data=request.data,
            context={
                "request": request,
                "workspace_id": workspace.id,
                "owned_by_id": request.user.id,
                "project_id": request.data.get("project"),
                "description": request.data.get("description", {}),
                "description_binary": request.data.get("description_binary"),
                "description_html": request.data.get("description_html", "<p></p>"),
            },
        )

        if serializer.is_valid():
            document = serializer.save()

            # Log creation
            log_document_access(
                document, request.user, DocumentAccessLog.ACCESS_TYPE_EDIT, request,
                {"action": "create"}
            )

            return Response(
                DocumentDetailSerializer(document, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, slug, pk):
        document = self.get_queryset().filter(pk=pk).first()

        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if this is an admin viewing a private document
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if document.access == Document.PRIVATE_ACCESS and document.owned_by_id != request.user.id:
            if is_admin:
                # Log admin access to private document for audit
                log_document_access(
                    document, request.user, DocumentAccessLog.ACCESS_TYPE_ADMIN_VIEW, request
                )
            else:
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Log normal view
            log_document_access(document, request.user, DocumentAccessLog.ACCESS_TYPE_VIEW, request)

        serializer = DocumentDetailSerializer(document, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, slug, pk):
        document = self.get_queryset().get(pk=pk)

        # Check ownership for access changes
        if (
            "access" in request.data
            and document.access != request.data.get("access")
            and document.owned_by_id != request.user.id
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
                    {"error": "Document cannot be its own parent"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = DocumentDetailSerializer(document, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            log_document_access(
                document, request.user, DocumentAccessLog.ACCESS_TYPE_EDIT, request,
                {"fields": list(request.data.keys())}
            )

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, slug):
        queryset = self.get_queryset()

        # Filter options
        collection = request.query_params.get("collection")
        project = request.query_params.get("project")
        parent = request.query_params.get("parent")
        access = request.query_params.get("access")
        archived = request.query_params.get("archived")
        owned_by_me = request.query_params.get("owned_by_me")
        document_type = request.query_params.get("document_type")
        state = request.query_params.get("state")

        # Filter by document_type - e.g., document_type=issue for work items
        if document_type:
            queryset = queryset.filter(document_type=document_type)

        # Filter by state - for issue-type documents
        if state:
            queryset = queryset.filter(state_id=state)

        # Filter by project - used for project Pages view
        if project:
            queryset = queryset.filter(project_id=project)

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

        serializer = DocumentSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, pk):
        document = self.get_queryset().get(pk=pk)

        # Must be archived before deleting
        if document.archived_at is None:
            return Response(
                {"error": "Document must be archived before deleting"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only owner or admin can delete
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if document.owned_by_id != request.user.id and not is_admin:
            return Response(
                {"error": "Only owner or admin can delete the document"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Remove parent from children
        Document.objects.filter(
            parent=document,
            workspace__slug=slug,
            deleted_at__isnull=True,
        ).update(parent=None)

        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def lock(self, request, slug, pk):
        document = self.get_queryset().get(pk=pk)
        document.is_locked = True
        document.locked_by = request.user
        document.save(update_fields=["is_locked", "locked_by"])

        log_document_access(document, request.user, DocumentAccessLog.ACCESS_TYPE_LOCK, request)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def unlock(self, request, slug, pk):
        document = self.get_queryset().get(pk=pk)
        document.is_locked = False
        document.locked_by = None
        document.save(update_fields=["is_locked", "locked_by"])

        log_document_access(document, request.user, DocumentAccessLog.ACCESS_TYPE_UNLOCK, request)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def archive(self, request, slug, pk):
        document = self.get_queryset().get(pk=pk)

        # Only owner or admin can archive
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if document.owned_by_id != request.user.id and not is_admin:
            return Response(
                {"error": "Only owner or admin can archive the document"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unarchive_archive_document_and_descendants(pk, datetime.now().date())

        log_document_access(document, request.user, DocumentAccessLog.ACCESS_TYPE_ARCHIVE, request)

        return Response({"archived_at": str(datetime.now().date())}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unarchive(self, request, slug, pk):
        document = self.get_queryset().get(pk=pk)

        # Only owner or admin can unarchive
        is_admin = WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        if document.owned_by_id != request.user.id and not is_admin:
            return Response(
                {"error": "Only owner or admin can unarchive the document"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If parent is archived, detach from parent
        if document.parent_id and document.parent.archived_at:
            document.parent = None
            document.save(update_fields=["parent"])

        unarchive_archive_document_and_descendants(pk, None)

        log_document_access(document, request.user, DocumentAccessLog.ACCESS_TYPE_RESTORE, request)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, slug, pk):
        document = self.get_queryset().get(pk=pk)

        # Create a copy
        new_document = Document.objects.create(
            workspace=document.workspace,
            collection=document.collection,
            parent=document.parent,
            name=f"{document.name} (Copy)",
            description=document.description,
            description_html=document.description_html,
            access=Document.PRIVATE_ACCESS,  # Always start as private
            owned_by=request.user,
            logo_props=document.logo_props,
            view_props=document.view_props,
        )

        log_document_access(
            new_document, request.user, DocumentAccessLog.ACCESS_TYPE_EDIT, request,
            {"action": "duplicate", "source_document_id": str(pk)}
        )

        serializer = DocumentDetailSerializer(new_document, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentDescriptionViewSet(BaseViewSet):
    """ViewSet for binary description operations."""

    permission_classes = [DocumentPermission]

    def get_document(self, slug, pk):
        user = self.request.user

        # Check if user is admin
        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = Document.objects.filter(
            pk=pk,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        if is_admin:
            return base_query.first()

        # Check access
        shared_documents = DocumentShare.objects.filter(
            user=user,
            deleted_at__isnull=True,
        ).values_list("document_id", flat=True)

        return base_query.filter(
            Q(owned_by=user) | Q(id__in=shared_documents)
        ).first()

    def retrieve(self, request, slug, pk):
        document = self.get_document(slug, pk)

        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        binary_data = document.description_binary

        def stream_data():
            if binary_data:
                yield binary_data
            else:
                yield b""

        response = StreamingHttpResponse(stream_data(), content_type="application/octet-stream")
        response["Content-Disposition"] = 'attachment; filename="document_description.bin"'
        return response

    def partial_update(self, request, slug, pk):
        document = self.get_document(slug, pk)

        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if document.archived_at:
            return Response(
                {"error_code": ERROR_CODES.get("PAGE_ARCHIVED", 4001), "error_message": "DOCUMENT_ARCHIVED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store existing state for version
        existing_instance = json.dumps(
            {"description_html": document.description_html}, cls=DjangoJSONEncoder
        )

        serializer = DocumentBinaryUpdateSerializer(document, data=request.data, partial=True)
        if serializer.is_valid():
            updated_document = serializer.save()

            # Create version snapshot
            DocumentVersion.objects.create(
                workspace=document.workspace,
                document=document,
                owned_by=request.user,
                description_binary=document.description_binary,
                description_html=document.description_html,
                description_json=document.description,
            )

            log_document_access(
                document, request.user, DocumentAccessLog.ACCESS_TYPE_EDIT, request,
                {"action": "update_description"}
            )

            return Response({"message": "Updated successfully"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

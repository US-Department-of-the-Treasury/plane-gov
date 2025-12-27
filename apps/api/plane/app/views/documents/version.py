# Third party imports
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action

# Package imports
from plane.app.permissions import DocumentPermission
from plane.app.serializers import DocumentVersionSerializer, DocumentVersionDetailSerializer
from plane.db.models import Document, DocumentVersion, DocumentShare, DocumentAccessLog, WorkspaceMember
from django.db.models import Q

# Local imports
from ..base import BaseViewSet
from .document import log_document_access


class DocumentVersionViewSet(BaseViewSet):
    """
    ViewSet for document version history.
    Supports listing versions and restoring to a previous version.
    """

    serializer_class = DocumentVersionSerializer
    model = DocumentVersion
    permission_classes = [DocumentPermission]

    def get_document(self, slug, document_id):
        user = self.request.user

        # Check if user is admin
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

        # Check access
        shared_documents = DocumentShare.objects.filter(
            user=user,
            deleted_at__isnull=True,
        ).values_list("document_id", flat=True)

        return base_query.filter(
            Q(owned_by=user) | Q(id__in=shared_documents)
        ).first()

    def get_queryset(self):
        return DocumentVersion.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            document_id=self.kwargs.get("document_id"),
            deleted_at__isnull=True,
        ).select_related("owned_by", "created_by").order_by("-created_at")

    def list(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        versions = self.get_queryset()

        # Pagination
        limit = int(request.query_params.get("limit", 20))
        offset = int(request.query_params.get("offset", 0))

        total = versions.count()
        versions = versions[offset : offset + limit]

        serializer = DocumentVersionSerializer(versions, many=True)
        return Response(
            {
                "results": serializer.data,
                "count": total,
                "next_offset": offset + limit if offset + limit < total else None,
            },
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        version = self.get_queryset().filter(pk=pk).first()
        if not version:
            return Response({"error": "Version not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DocumentVersionDetailSerializer(version)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def restore(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check edit permission
        if document.owned_by_id != request.user.id:
            share = DocumentShare.objects.filter(
                document=document,
                user=request.user,
                permission__in=[DocumentShare.EDIT_PERMISSION, DocumentShare.ADMIN_PERMISSION],
                deleted_at__isnull=True,
            ).first()

            if not share:
                return Response(
                    {"error": "You don't have permission to restore this document"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        version = self.get_queryset().filter(pk=pk).first()
        if not version:
            return Response({"error": "Version not found"}, status=status.HTTP_404_NOT_FOUND)

        # Create a new version with current state before restoring
        DocumentVersion.objects.create(
            workspace=document.workspace,
            document=document,
            owned_by=request.user,
            description_binary=document.description_binary,
            description_html=document.description_html,
            description_json=document.description,
        )

        # Restore the document content
        document.description_binary = version.description_binary
        document.description_html = version.description_html
        document.description = version.description_json
        document.save(update_fields=["description_binary", "description_html", "description"])

        log_document_access(
            document, request.user, DocumentAccessLog.ACCESS_TYPE_EDIT, request,
            {"action": "restore", "restored_version_id": str(pk)}
        )

        return Response({"message": "Version restored successfully"}, status=status.HTTP_200_OK)

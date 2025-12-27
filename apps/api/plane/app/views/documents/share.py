# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import DocumentPermission
from plane.app.serializers import DocumentShareSerializer
from plane.db.models import Document, DocumentShare, DocumentAccessLog, WorkspaceMember

# Local imports
from ..base import BaseViewSet
from .document import log_document_access, get_client_ip


class DocumentShareViewSet(BaseViewSet):
    """
    ViewSet for managing document shares.
    Allows document owners to share documents with other users.
    """

    serializer_class = DocumentShareSerializer
    model = DocumentShare
    permission_classes = [DocumentPermission]

    def get_queryset(self):
        return DocumentShare.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            document_id=self.kwargs.get("document_id"),
            deleted_at__isnull=True,
        ).select_related("user", "document", "created_by")

    def create(self, request, slug, document_id):
        document = Document.objects.get(
            pk=document_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        # Only owner can share
        if document.owned_by_id != request.user.id:
            # Check if user has admin share permission
            user_share = DocumentShare.objects.filter(
                document=document,
                user=request.user,
                permission=DocumentShare.ADMIN_PERMISSION,
                deleted_at__isnull=True,
            ).first()

            if not user_share:
                return Response(
                    {"error": "Only owner or share admins can share this document"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        user_id = request.data.get("user")
        permission = request.data.get("permission", DocumentShare.VIEW_PERMISSION)

        # Can't share with yourself
        if str(user_id) == str(request.user.id):
            return Response(
                {"error": "Cannot share with yourself"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check user is a workspace member
        if not WorkspaceMember.objects.filter(
            member_id=user_id,
            workspace__slug=slug,
            is_active=True,
        ).exists():
            return Response(
                {"error": "User is not a workspace member"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for existing share
        existing_share = DocumentShare.objects.filter(
            document=document,
            user_id=user_id,
            deleted_at__isnull=True,
        ).first()

        if existing_share:
            # Update existing share
            existing_share.permission = permission
            existing_share.save(update_fields=["permission"])
            serializer = DocumentShareSerializer(existing_share)
        else:
            # Create new share
            share = DocumentShare.objects.create(
                document=document,
                user_id=user_id,
                permission=permission,
                workspace=document.workspace,
            )
            serializer = DocumentShareSerializer(share)

        # Update document access to SHARED if it was PRIVATE
        if document.access == Document.PRIVATE_ACCESS:
            document.access = Document.SHARED_ACCESS
            document.save(update_fields=["access"])

        log_document_access(
            document, request.user, DocumentAccessLog.ACCESS_TYPE_SHARE, request,
            {"shared_with": str(user_id), "permission": permission}
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug, document_id, pk):
        share = self.get_queryset().get(pk=pk)
        document = share.document

        # Only owner or share admins can update shares
        if document.owned_by_id != request.user.id:
            user_share = DocumentShare.objects.filter(
                document=document,
                user=request.user,
                permission=DocumentShare.ADMIN_PERMISSION,
                deleted_at__isnull=True,
            ).first()

            if not user_share:
                return Response(
                    {"error": "Only owner or share admins can modify shares"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        permission = request.data.get("permission")
        if permission is not None:
            share.permission = permission
            share.save(update_fields=["permission"])

        serializer = DocumentShareSerializer(share)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, document_id, pk):
        share = self.get_queryset().get(pk=pk)
        document = share.document

        # Only owner or share admins can remove shares
        if document.owned_by_id != request.user.id:
            user_share = DocumentShare.objects.filter(
                document=document,
                user=request.user,
                permission=DocumentShare.ADMIN_PERMISSION,
                deleted_at__isnull=True,
            ).first()

            if not user_share:
                return Response(
                    {"error": "Only owner or share admins can remove shares"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        removed_user_id = str(share.user_id)
        share.delete()

        # If no more shares, set document back to private
        remaining_shares = DocumentShare.objects.filter(
            document=document,
            deleted_at__isnull=True,
        ).count()

        if remaining_shares == 0 and document.access == Document.SHARED_ACCESS:
            document.access = Document.PRIVATE_ACCESS
            document.save(update_fields=["access"])

        log_document_access(
            document, request.user, DocumentAccessLog.ACCESS_TYPE_UNSHARE, request,
            {"removed_user": removed_user_id}
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request, slug, document_id):
        shares = self.get_queryset()
        serializer = DocumentShareSerializer(shares, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

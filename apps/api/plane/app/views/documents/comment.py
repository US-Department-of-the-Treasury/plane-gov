# Django imports
from django.db.models import Prefetch
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import DocumentPermission
from plane.app.serializers import DocumentCommentSerializer, DocumentCommentReactionSerializer
from plane.db.models import (
    Document,
    DocumentComment,
    DocumentCommentReaction,
    DocumentActivity,
    Workspace,
    WorkspaceMember,
)

# Local imports
from ..base import BaseViewSet


class DocumentCommentViewSet(BaseViewSet):
    """
    ViewSet for managing document comments.
    For issue-type documents, this replaces IssueComment functionality.
    """

    serializer_class = DocumentCommentSerializer
    model = DocumentComment
    permission_classes = [DocumentPermission]

    def get_document(self, slug, document_id):
        """Get the document and verify access."""
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

        # Regular users can access their own documents
        return base_query.filter(owned_by=user).first()

    def get_queryset(self):
        document_id = self.kwargs.get("document_id")
        slug = self.kwargs.get("slug")

        return (
            DocumentComment.objects.filter(
                document_id=document_id,
                document__workspace__slug=slug,
                deleted_at__isnull=True,
            )
            .select_related("actor", "parent")
            .prefetch_related(
                Prefetch(
                    "reactions",
                    queryset=DocumentCommentReaction.objects.filter(
                        deleted_at__isnull=True
                    ).select_related("actor"),
                )
            )
            .order_by("-created_at")
        )

    def list(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        serializer = DocumentCommentSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DocumentCommentSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            comment = serializer.save(
                document=document,
                workspace=document.workspace,
                actor=request.user,
                created_by=request.user,
                updated_by=request.user,
            )

            # Log activity
            DocumentActivity.objects.create(
                workspace=document.workspace,
                document=document,
                verb="comment_created",
                document_comment=comment,
                actor=request.user,
                created_by=request.user,
                updated_by=request.user,
            )

            return Response(
                DocumentCommentSerializer(comment, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        comment = self.get_queryset().filter(pk=pk).first()
        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DocumentCommentSerializer(comment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        comment = self.get_queryset().filter(pk=pk).first()
        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        # Only the comment author can edit
        if comment.actor_id != request.user.id:
            return Response(
                {"error": "Only the comment author can edit"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DocumentCommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            comment = serializer.save(
                edited_at=timezone.now(),
                updated_by=request.user,
            )

            # Log activity
            DocumentActivity.objects.create(
                workspace=document.workspace,
                document=document,
                verb="comment_updated",
                document_comment=comment,
                actor=request.user,
                created_by=request.user,
                updated_by=request.user,
            )

            return Response(
                DocumentCommentSerializer(comment, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        comment = self.get_queryset().filter(pk=pk).first()
        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        # Only the comment author or document owner can delete
        if comment.actor_id != request.user.id and document.owned_by_id != request.user.id:
            # Check if admin
            is_admin = WorkspaceMember.objects.filter(
                member=request.user,
                workspace__slug=slug,
                role=20,
                is_active=True,
            ).exists()
            if not is_admin:
                return Response(
                    {"error": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Log activity before delete
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="comment_deleted",
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentCommentReactionViewSet(BaseViewSet):
    """
    ViewSet for managing comment reactions.
    """

    serializer_class = DocumentCommentReactionSerializer
    model = DocumentCommentReaction
    permission_classes = [DocumentPermission]

    def get_queryset(self):
        comment_id = self.kwargs.get("comment_id")
        return DocumentCommentReaction.objects.filter(
            comment_id=comment_id,
            deleted_at__isnull=True,
        ).select_related("actor")

    def create(self, request, slug, document_id, comment_id):
        # Verify comment exists
        comment = DocumentComment.objects.filter(
            pk=comment_id,
            document_id=document_id,
            document__workspace__slug=slug,
            deleted_at__isnull=True,
        ).first()

        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        reaction = request.data.get("reaction")
        if not reaction:
            return Response({"error": "Reaction is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if reaction already exists
        existing = DocumentCommentReaction.objects.filter(
            comment=comment,
            actor=request.user,
            reaction=reaction,
            deleted_at__isnull=True,
        ).first()

        if existing:
            return Response(
                {"error": "You already reacted with this emoji"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reaction_obj = DocumentCommentReaction.objects.create(
            comment=comment,
            actor=request.user,
            reaction=reaction,
            workspace=comment.workspace,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            DocumentCommentReactionSerializer(reaction_obj).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, slug, document_id, comment_id, pk):
        reaction = self.get_queryset().filter(pk=pk).first()
        if not reaction:
            return Response({"error": "Reaction not found"}, status=status.HTTP_404_NOT_FOUND)

        # Only the reactor can remove their reaction
        if reaction.actor_id != request.user.id:
            return Response(
                {"error": "You can only remove your own reactions"},
                status=status.HTTP_403_FORBIDDEN,
            )

        reaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

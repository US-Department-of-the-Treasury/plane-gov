# Django imports
from django.db.models import Prefetch
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import WikiPagePermission
from plane.app.serializers import PageCommentSerializer, PageCommentReactionSerializer
from plane.db.models import (
    WikiPage,
    PageComment,
    PageCommentReaction,
    PageActivity,
    Workspace,
    WorkspaceMember,
)

# Local imports
from ..base import BaseViewSet


class PageCommentViewSet(BaseViewSet):
    """
    ViewSet for managing page comments.
    For issue-type pages, this replaces IssueComment functionality.
    """

    serializer_class = PageCommentSerializer
    model = PageComment
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

        return (
            PageComment.objects.filter(
                page_id=page_id,
                page__workspace__slug=slug,
                deleted_at__isnull=True,
            )
            .select_related("actor", "parent")
            .prefetch_related(
                Prefetch(
                    "reactions",
                    queryset=PageCommentReaction.objects.filter(
                        deleted_at__isnull=True
                    ).select_related("actor"),
                )
            )
            .order_by("-created_at")
        )

    def list(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        serializer = PageCommentSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug, page_id):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = PageCommentSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            comment = serializer.save(
                page=page,
                workspace=page.workspace,
                actor=request.user,
                created_by=request.user,
                updated_by=request.user,
            )

            # Log activity
            PageActivity.objects.create(
                workspace=page.workspace,
                page=page,
                verb="comment_created",
                page_comment=comment,
                actor=request.user,
                created_by=request.user,
                updated_by=request.user,
            )

            return Response(
                PageCommentSerializer(comment, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        comment = self.get_queryset().filter(pk=pk).first()
        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = PageCommentSerializer(comment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        comment = self.get_queryset().filter(pk=pk).first()
        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        # Only the comment author can edit
        if comment.actor_id != request.user.id:
            return Response(
                {"error": "Only the comment author can edit"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PageCommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            comment = serializer.save(
                edited_at=timezone.now(),
                updated_by=request.user,
            )

            # Log activity
            PageActivity.objects.create(
                workspace=page.workspace,
                page=page,
                verb="comment_updated",
                page_comment=comment,
                actor=request.user,
                created_by=request.user,
                updated_by=request.user,
            )

            return Response(
                PageCommentSerializer(comment, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, page_id, pk):
        page = self.get_page(slug, page_id)
        if not page:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        comment = self.get_queryset().filter(pk=pk).first()
        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        # Only the comment author or page owner can delete
        if comment.actor_id != request.user.id and page.owned_by_id != request.user.id:
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
        PageActivity.objects.create(
            workspace=page.workspace,
            page=page,
            verb="comment_deleted",
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PageCommentReactionViewSet(BaseViewSet):
    """
    ViewSet for managing comment reactions.
    """

    serializer_class = PageCommentReactionSerializer
    model = PageCommentReaction
    permission_classes = [WikiPagePermission]

    def get_queryset(self):
        comment_id = self.kwargs.get("comment_id")
        return PageCommentReaction.objects.filter(
            comment_id=comment_id,
            deleted_at__isnull=True,
        ).select_related("actor")

    def create(self, request, slug, page_id, comment_id):
        # Verify comment exists
        comment = PageComment.objects.filter(
            pk=comment_id,
            page_id=page_id,
            page__workspace__slug=slug,
            deleted_at__isnull=True,
        ).first()

        if not comment:
            return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

        reaction = request.data.get("reaction")
        if not reaction:
            return Response({"error": "Reaction is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if reaction already exists
        existing = PageCommentReaction.objects.filter(
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

        reaction_obj = PageCommentReaction.objects.create(
            comment=comment,
            actor=request.user,
            reaction=reaction,
            workspace=comment.workspace,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            PageCommentReactionSerializer(reaction_obj).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, slug, page_id, comment_id, pk):
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

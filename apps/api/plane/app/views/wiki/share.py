# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import WikiPagePermission
from plane.app.serializers import WikiPageShareSerializer
from plane.db.models import WikiPage, WikiPageShare, WikiPageAccessLog, WorkspaceMember

# Local imports
from ..base import BaseViewSet
from .page import log_wiki_access, get_client_ip


class WikiPageShareViewSet(BaseViewSet):
    """
    ViewSet for managing wiki page shares.
    Allows page owners to share pages with other users.
    """

    serializer_class = WikiPageShareSerializer
    model = WikiPageShare
    permission_classes = [WikiPagePermission]

    def get_queryset(self):
        return WikiPageShare.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            page_id=self.kwargs.get("page_id"),
            deleted_at__isnull=True,
        ).select_related("user", "page", "created_by")

    def create(self, request, slug, page_id):
        page = WikiPage.objects.get(
            pk=page_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        # Only owner can share
        if page.owned_by_id != request.user.id:
            # Check if user has admin share permission
            user_share = WikiPageShare.objects.filter(
                page=page,
                user=request.user,
                permission=WikiPageShare.ADMIN_PERMISSION,
                deleted_at__isnull=True,
            ).first()

            if not user_share:
                return Response(
                    {"error": "Only owner or share admins can share this page"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        user_id = request.data.get("user")
        permission = request.data.get("permission", WikiPageShare.VIEW_PERMISSION)

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
        existing_share = WikiPageShare.objects.filter(
            page=page,
            user_id=user_id,
            deleted_at__isnull=True,
        ).first()

        if existing_share:
            # Update existing share
            existing_share.permission = permission
            existing_share.save(update_fields=["permission"])
            serializer = WikiPageShareSerializer(existing_share)
        else:
            # Create new share
            share = WikiPageShare.objects.create(
                page=page,
                user_id=user_id,
                permission=permission,
                workspace=page.workspace,
            )
            serializer = WikiPageShareSerializer(share)

        # Update page access to SHARED if it was PRIVATE
        if page.access == WikiPage.PRIVATE_ACCESS:
            page.access = WikiPage.SHARED_ACCESS
            page.save(update_fields=["access"])

        log_wiki_access(
            page, request.user, WikiPageAccessLog.ACCESS_TYPE_SHARE, request,
            {"shared_with": str(user_id), "permission": permission}
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug, page_id, pk):
        share = self.get_queryset().get(pk=pk)
        page = share.page

        # Only owner or share admins can update shares
        if page.owned_by_id != request.user.id:
            user_share = WikiPageShare.objects.filter(
                page=page,
                user=request.user,
                permission=WikiPageShare.ADMIN_PERMISSION,
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

        serializer = WikiPageShareSerializer(share)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, page_id, pk):
        share = self.get_queryset().get(pk=pk)
        page = share.page

        # Only owner or share admins can remove shares
        if page.owned_by_id != request.user.id:
            user_share = WikiPageShare.objects.filter(
                page=page,
                user=request.user,
                permission=WikiPageShare.ADMIN_PERMISSION,
                deleted_at__isnull=True,
            ).first()

            if not user_share:
                return Response(
                    {"error": "Only owner or share admins can remove shares"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        removed_user_id = str(share.user_id)
        share.delete()

        # If no more shares, set page back to private
        remaining_shares = WikiPageShare.objects.filter(
            page=page,
            deleted_at__isnull=True,
        ).count()

        if remaining_shares == 0 and page.access == WikiPage.SHARED_ACCESS:
            page.access = WikiPage.PRIVATE_ACCESS
            page.save(update_fields=["access"])

        log_wiki_access(
            page, request.user, WikiPageAccessLog.ACCESS_TYPE_UNSHARE, request,
            {"removed_user": removed_user_id}
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request, slug, page_id):
        shares = self.get_queryset()
        serializer = WikiPageShareSerializer(shares, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

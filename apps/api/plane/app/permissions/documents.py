# Third Party imports
from rest_framework.permissions import BasePermission, SAFE_METHODS

# Package imports
from plane.db.models import WorkspaceMember, Document, DocumentShare


# Permission Mappings
Admin = 20
Member = 15
Guest = 5


class DocumentPermission(BasePermission):
    """
    Custom permission class for Documents.

    Access rules:
    - PRIVATE documents: Only owner can access (admins can view with logging)
    - SHARED documents: Only owner and explicitly shared users can access
    - PUBLIC documents: Disabled for government compliance

    For mutations:
    - Owner can always edit
    - Shared users with EDIT or ADMIN permission can edit
    - is_locked is a soft warning, not enforced at permission level
    """

    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False

        # User must be a workspace member
        return WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=view.workspace_slug,
            is_active=True,
        ).exists()

    def has_object_permission(self, request, view, obj):
        if request.user.is_anonymous:
            return False

        user = request.user

        # Owner always has full access
        if obj.owned_by_id == user.id:
            return True

        # Check workspace admin status for read access
        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=view.workspace_slug,
            role=Admin,
            is_active=True,
        ).exists()

        # PRIVATE documents: owner only, but admins can view (with logging)
        if obj.access == Document.PRIVATE_ACCESS:
            if request.method in SAFE_METHODS and is_admin:
                # Admin viewing private document - should be logged by the view
                return True
            return False

        # SHARED documents: check share permissions
        if obj.access == Document.SHARED_ACCESS:
            share = DocumentShare.objects.filter(
                document=obj,
                user=user,
                deleted_at__isnull=True,
            ).first()

            if not share:
                # Admin can view shared documents
                if request.method in SAFE_METHODS and is_admin:
                    return True
                return False

            # For safe methods, any share permission works
            if request.method in SAFE_METHODS:
                return True

            # For mutations, need EDIT or ADMIN permission
            return share.permission in [
                DocumentShare.EDIT_PERMISSION,
                DocumentShare.ADMIN_PERMISSION,
            ]

        # PUBLIC access is disabled for government compliance
        return False


class DocumentCollectionPermission(BasePermission):
    """
    Permission class for Document collections.
    All workspace members can view collections.
    Only admins and members can create/edit collections.
    """

    def has_permission(self, request, view):
        if request.user.is_anonymous:
            return False

        # All workspace members can view
        if request.method in SAFE_METHODS:
            return WorkspaceMember.objects.filter(
                member=request.user,
                workspace__slug=view.workspace_slug,
                is_active=True,
            ).exists()

        # Only admins and members can create/edit collections
        return WorkspaceMember.objects.filter(
            member=request.user,
            workspace__slug=view.workspace_slug,
            role__in=[Admin, Member],
            is_active=True,
        ).exists()

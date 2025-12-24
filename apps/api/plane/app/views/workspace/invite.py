# Python imports
from datetime import timedelta
import secrets
import uuid

# Django imports
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone

# Third party epics
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Package imports
from plane.app.permissions import WorkSpaceAdminPermission
from plane.app.serializers import (
    WorkSpaceMemberInviteSerializer,
    WorkSpaceMemberSerializer,
)
from plane.app.views.base import BaseAPIView
from plane.bgtasks.event_tracking_task import workspace_invite_event
from plane.bgtasks.workspace_invitation_task import workspace_invitation
from plane.db.models import User, Workspace, WorkspaceMember, WorkspaceMemberInvite, UserStatusChoices, Profile
from plane.utils.cache import invalidate_cache, invalidate_cache_directly
from plane.utils.host import base_host
from plane.utils.ip_address import get_client_ip
from .. import BaseViewSet


def generate_unique_username(email):
    """Generate a unique username from email, adding UUID suffix if needed."""
    prefix = email.split("@")[0]
    # Start with just the prefix
    username = prefix
    # If it already exists, add a UUID suffix
    if User.objects.filter(username=username).exists():
        username = f"{prefix}_{uuid.uuid4().hex[:8]}"
    return username


def generate_invitation_token():
    """Generate a secure invitation token."""
    return secrets.token_urlsafe(32)


class WorkspaceInvitationsViewset(BaseViewSet):
    """Endpoint for creating, listing and  deleting workspaces"""

    serializer_class = WorkSpaceMemberInviteSerializer
    model = WorkspaceMemberInvite

    permission_classes = [WorkSpaceAdminPermission]

    def get_queryset(self):
        return self.filter_queryset(
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .select_related("workspace", "workspace__owner", "created_by")
        )

    def create(self, request, slug):
        emails = request.data.get("emails", [])
        # Check if email is provided
        if not emails:
            return Response({"error": "Emails are required"}, status=status.HTTP_400_BAD_REQUEST)

        # check for role level of the requesting user
        requesting_user = WorkspaceMember.objects.get(workspace__slug=slug, member=request.user, is_active=True)

        # Check if any invited user has an higher role
        if len([email for email in emails if int(email.get("role", 5)) > requesting_user.role]):
            return Response(
                {"error": "You cannot invite a user with higher role"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the workspace object
        workspace = Workspace.objects.get(slug=slug)

        # Check if user is already an active member of workspace
        workspace_members = WorkspaceMember.objects.filter(
            workspace_id=workspace.id,
            member__email__in=[email.get("email") for email in emails],
            member__status=UserStatusChoices.ACTIVE,
            is_active=True,
        ).select_related("member", "member__avatar_asset")

        if workspace_members:
            return Response(
                {
                    "error": "Some users are already member of workspace",
                    "workspace_users": WorkSpaceMemberSerializer(workspace_members, many=True).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_site = base_host(request=request, is_app=True)
        invited_users = []

        for email_data in emails:
            try:
                email = email_data.get("email").strip().lower()
                validate_email(email)
                role = email_data.get("role", 5)

                # Check if user already exists
                existing_user = User.objects.filter(email=email).first()

                if existing_user:
                    if existing_user.status == UserStatusChoices.ACTIVE:
                        # User is already active - they need to be added via different flow
                        # This shouldn't happen due to the check above, but handle gracefully
                        continue
                    elif existing_user.status == UserStatusChoices.INVITED:
                        # Resend invitation - refresh token and expiry
                        existing_user.invitation_token = generate_invitation_token()
                        existing_user.invitation_expires_at = timezone.now() + timedelta(days=14)
                        existing_user.save(update_fields=['invitation_token', 'invitation_expires_at'])
                        user = existing_user
                    else:
                        # Deactivated user - reactivate as invited
                        existing_user.status = UserStatusChoices.INVITED
                        existing_user.invited_at = timezone.now()
                        existing_user.invited_by = request.user
                        existing_user.invitation_token = generate_invitation_token()
                        existing_user.invitation_expires_at = timezone.now() + timedelta(days=14)
                        existing_user.save(update_fields=[
                            'status', 'invited_at', 'invited_by',
                            'invitation_token', 'invitation_expires_at'
                        ])
                        user = existing_user
                else:
                    # Create shadow user
                    user = User.objects.create(
                        email=email,
                        username=generate_unique_username(email),
                        display_name=email,  # Use full email as display name until user sets their own
                        status=UserStatusChoices.INVITED,
                        invited_at=timezone.now(),
                        invited_by=request.user,
                        invitation_token=generate_invitation_token(),
                        invitation_expires_at=timezone.now() + timedelta(days=14),
                        is_active=False,  # Cannot login until invitation accepted
                    )
                    # Create profile for shadow user
                    Profile.objects.create(user=user)

                # Create or update workspace membership
                workspace_member, created = WorkspaceMember.objects.get_or_create(
                    workspace=workspace,
                    member=user,
                    defaults={
                        'role': role,
                        'created_by': request.user,
                    }
                )
                if not created:
                    # Update existing membership
                    workspace_member.role = role
                    workspace_member.is_active = True
                    workspace_member.save(update_fields=['role', 'is_active'])

                invited_users.append(user)

                # Also create WorkspaceMemberInvite for backward compatibility with email task
                # TODO: Remove this once email task is updated to use User.invitation_token
                WorkspaceMemberInvite.objects.update_or_create(
                    email=email,
                    workspace=workspace,
                    defaults={
                        'token': user.invitation_token,
                        'role': role,
                        'created_by': request.user,
                    }
                )

            except ValidationError:
                return Response(
                    {
                        "error": f"Invalid email - {email_data} provided a valid email address is required to send the invite"  # noqa: E501
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Send invitations
        for user in invited_users:
            workspace_invitation.delay(
                user.email,
                workspace.id,
                user.invitation_token,
                current_site,
                request.user.email,
            )

        return Response({"message": "Emails sent successfully"}, status=status.HTTP_200_OK)

    def destroy(self, request, slug, pk):
        workspace_member_invite = WorkspaceMemberInvite.objects.get(pk=pk, workspace__slug=slug)

        # Check if this invite has a corresponding shadow user with assignments
        shadow_user = User.objects.filter(
            email=workspace_member_invite.email,
            status=UserStatusChoices.INVITED
        ).first()

        if shadow_user:
            # Import here to avoid circular imports
            from plane.db.models import Project, Issue

            # Check for assignments that would be orphaned
            assignments = []
            if Project.objects.filter(project_lead=shadow_user).exists():
                assignments.append("project lead")
            if Issue.objects.filter(assignees=shadow_user).exists():
                assignments.append("issue assignee")

            if assignments:
                return Response(
                    {
                        "error": f"Cannot revoke invitation: user is assigned as "
                                 f"{', '.join(assignments)}. Remove assignments first.",
                        "assignments": assignments,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Safe to revoke - deactivate the shadow user and workspace membership
            shadow_user.status = UserStatusChoices.DEACTIVATED
            shadow_user.invitation_token = None
            shadow_user.save(update_fields=['status', 'invitation_token'])

            WorkspaceMember.objects.filter(
                member=shadow_user,
                workspace__slug=slug
            ).update(is_active=False)

        # Delete the invitation record
        workspace_member_invite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceJoinEndpoint(BaseAPIView):
    permission_classes = [AllowAny]
    """Invitation response endpoint the user can respond to the invitation"""

    @invalidate_cache(path="/api/workspaces/", user=False)
    @invalidate_cache(path="/api/users/me/workspaces/", multiple=True)
    @invalidate_cache(
        path="/api/workspaces/:slug/members/",
        user=False,
        multiple=True,
        url_params=True,
    )
    @invalidate_cache(path="/api/users/me/settings/", multiple=True)
    def post(self, request, slug, pk):
        workspace_invite = WorkspaceMemberInvite.objects.get(pk=pk, workspace__slug=slug)

        email = request.data.get("email", "")

        # Check the email
        if email == "" or workspace_invite.email != email:
            return Response(
                {"error": "You do not have permission to join the workspace"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # If already responded then return error
        if workspace_invite.responded_at is None:
            workspace_invite.accepted = request.data.get("accepted", False)
            workspace_invite.responded_at = timezone.now()
            workspace_invite.save()

            if workspace_invite.accepted:
                # With shadow user pattern, user should already exist
                user = User.objects.filter(email=email).first()

                if user is not None:
                    # Activate the shadow user if they were invited
                    if user.status == UserStatusChoices.INVITED:
                        user.status = UserStatusChoices.ACTIVE
                        user.activated_at = timezone.now()
                        user.invitation_token = None
                        user.invitation_expires_at = None
                        user.is_active = True  # Enable login
                        user.save(update_fields=[
                            'status', 'activated_at', 'invitation_token',
                            'invitation_expires_at', 'is_active'
                        ])

                    # Ensure workspace membership exists and is active
                    workspace_member = WorkspaceMember.objects.filter(
                        workspace=workspace_invite.workspace, member=user
                    ).first()
                    if workspace_member is not None:
                        workspace_member.is_active = True
                        workspace_member.role = workspace_invite.role
                        workspace_member.save()
                    else:
                        # Create workspace membership (shouldn't happen with shadow users, but handle gracefully)
                        WorkspaceMember.objects.create(
                            workspace=workspace_invite.workspace,
                            member=user,
                            role=workspace_invite.role,
                        )

                    # Set the user last_workspace_id to the accepted workspace
                    # Use get_or_create in case profile doesn't exist (legacy edge case)
                    profile, _ = Profile.objects.get_or_create(user=user)
                    profile.last_workspace_id = workspace_invite.workspace.id
                    profile.save(update_fields=['last_workspace_id'])

                    # Delete the invitation record (backward compatibility cleanup)
                    workspace_invite.delete()

                # Send event
                workspace_invite_event.delay(
                    user=user.id if user is not None else None,
                    email=email,
                    user_agent=request.META.get("HTTP_USER_AGENT"),
                    ip=get_client_ip(request=request),
                    event_name="MEMBER_ACCEPTED",
                    accepted_from="EMAIL",
                )

                return Response(
                    {"message": "Workspace Invitation Accepted"},
                    status=status.HTTP_200_OK,
                )

            # Workspace invitation rejected
            return Response(
                {"message": "Workspace Invitation was not accepted"},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": "You have already responded to the invitation request"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def get(self, request, slug, pk):
        workspace_invitation = WorkspaceMemberInvite.objects.get(workspace__slug=slug, pk=pk)
        serializer = WorkSpaceMemberInviteSerializer(workspace_invitation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserWorkspaceInvitationsViewSet(BaseViewSet):
    serializer_class = WorkSpaceMemberInviteSerializer
    model = WorkspaceMemberInvite

    def get_queryset(self):
        return self.filter_queryset(
            super().get_queryset().filter(email=self.request.user.email).select_related("workspace")
        )

    @invalidate_cache(path="/api/workspaces/", user=False)
    @invalidate_cache(path="/api/users/me/workspaces/", multiple=True)
    def create(self, request):
        invitations = request.data.get("invitations", [])
        workspace_invitations = WorkspaceMemberInvite.objects.filter(
            pk__in=invitations, email=request.user.email
        ).order_by("-created_at")

        # Activate shadow user if status is invited
        user = request.user
        if user.status == UserStatusChoices.INVITED:
            user.status = UserStatusChoices.ACTIVE
            user.activated_at = timezone.now()
            user.invitation_token = None
            user.invitation_expires_at = None
            user.is_active = True
            user.save(update_fields=[
                'status', 'activated_at', 'invitation_token',
                'invitation_expires_at', 'is_active'
            ])

        # If the user is already a member of workspace and was deactivated then activate the user
        for invitation in workspace_invitations:
            invalidate_cache_directly(
                path=f"/api/workspaces/{invitation.workspace.slug}/members/",
                user=False,
                request=request,
                multiple=True,
            )
            # Update the WorkspaceMember for this specific invitation
            WorkspaceMember.objects.filter(workspace_id=invitation.workspace_id, member=request.user).update(
                is_active=True, role=invitation.role
            )

        # Bulk create workspace memberships for all workspaces (if not already existing)
        WorkspaceMember.objects.bulk_create(
            [
                WorkspaceMember(
                    workspace=invitation.workspace,
                    member=request.user,
                    role=invitation.role,
                    created_by=request.user,
                )
                for invitation in workspace_invitations
            ],
            ignore_conflicts=True,
        )

        # Delete joined workspace invites (backward compatibility cleanup)
        workspace_invitations.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

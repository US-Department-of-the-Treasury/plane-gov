# Generated migration to convert WorkspaceMemberInvite records to shadow users

import uuid
from django.db import migrations


def generate_unique_username(apps, email):
    """Generate a unique username from email, adding UUID suffix if needed."""
    User = apps.get_model('db', 'User')
    prefix = email.split("@")[0]
    username = prefix
    if User.objects.filter(username=username).exists():
        username = f"{prefix}_{uuid.uuid4().hex[:8]}"
    return username


def migrate_invitations_to_shadow_users(apps, schema_editor):
    """
    Convert WorkspaceMemberInvite records to shadow User records.

    For each pending invitation:
    1. Check if user already exists
    2. If not, create shadow user with status='invited'
    3. Create WorkspaceMember record linking shadow user to workspace
    """
    User = apps.get_model('db', 'User')
    Profile = apps.get_model('db', 'Profile')
    WorkspaceMemberInvite = apps.get_model('db', 'WorkspaceMemberInvite')
    WorkspaceMember = apps.get_model('db', 'WorkspaceMember')

    # Process only invitations that haven't been accepted yet
    pending_invites = WorkspaceMemberInvite.objects.filter(accepted=False)

    for invite in pending_invites:
        email = invite.email.lower().strip()

        # Check if user already exists
        existing_user = User.objects.filter(email=email).first()

        if existing_user:
            # User exists - check their status
            if existing_user.status == 'active':
                # Active user - just ensure they have workspace membership
                WorkspaceMember.objects.get_or_create(
                    workspace_id=invite.workspace_id,
                    member=existing_user,
                    defaults={
                        'role': invite.role,
                        'created_by_id': invite.created_by_id,
                    }
                )
                continue
            elif existing_user.status == 'invited':
                # Already invited - use existing shadow user
                user = existing_user
            else:
                # Deactivated - reactivate as invited
                existing_user.status = 'invited'
                existing_user.invited_at = invite.created_at
                existing_user.invited_by_id = invite.created_by_id
                existing_user.invitation_token = invite.token
                existing_user.save(update_fields=[
                    'status', 'invited_at', 'invited_by_id', 'invitation_token'
                ])
                user = existing_user
        else:
            # Create new shadow user
            user = User.objects.create(
                email=email,
                username=generate_unique_username(apps, email),
                status='invited',
                invited_at=invite.created_at,
                invited_by_id=invite.created_by_id,
                invitation_token=invite.token,
                is_active=False,  # Cannot login until invitation accepted
            )
            # Create profile for shadow user
            Profile.objects.create(user=user)

        # Create workspace membership for the shadow user
        WorkspaceMember.objects.get_or_create(
            workspace_id=invite.workspace_id,
            member=user,
            defaults={
                'role': invite.role,
                'created_by_id': invite.created_by_id,
            }
        )


def reverse_migration(apps, schema_editor):
    """
    Reverse the migration by removing shadow users.

    Note: This is a destructive operation and will remove users that
    were created during the forward migration.
    """
    User = apps.get_model('db', 'User')
    WorkspaceMember = apps.get_model('db', 'WorkspaceMember')

    # Find all invited users (shadow users)
    shadow_users = User.objects.filter(status='invited')

    # Delete their workspace memberships
    WorkspaceMember.objects.filter(member__in=shadow_users).delete()

    # Delete the shadow users
    shadow_users.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('db', '0121b_fix_invitation_token_length'),
    ]

    operations = [
        migrations.RunPython(
            migrate_invitations_to_shadow_users,
            reverse_code=reverse_migration,
        ),
    ]

# Development-only endpoints for testing and seeding data
# These endpoints only work when DEBUG=True or PLANE_DEV_ENDPOINTS=1

import os
import random
import uuid

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.views.base import BaseAPIView
from plane.db.models import User, Profile, Workspace, WorkspaceMember


def is_dev_mode(request=None):
    """Check if dev endpoints should be enabled.

    Returns True if either:
    - Django DEBUG is True
    - PLANE_DEV_ENDPOINTS env var is set AND request is from localhost

    The localhost check is a safety net - even if PLANE_DEV_ENDPOINTS is
    accidentally set in production, it won't work because requests won't
    come from localhost.
    """
    if settings.DEBUG:
        return True

    dev_endpoints = os.environ.get("PLANE_DEV_ENDPOINTS", "").lower()
    if dev_endpoints not in ("1", "true"):
        return False

    # Extra safety: only allow if request is from localhost
    if request:
        remote_addr = request.META.get("REMOTE_ADDR", "")
        if remote_addr not in ("127.0.0.1", "::1", "localhost"):
            return False

    return True


# Realistic first names for fake users
FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
    "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
    "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
    "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
]

# Realistic last names for fake users
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
    "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
    "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts", "Turner", "Phillips", "Evans", "Parker", "Edwards", "Collins",
    "Stewart", "Murphy", "Cook", "Rogers", "Morgan", "Peterson", "Cooper", "Reed",
    "Bailey", "Bell", "Gomez", "Kelly", "Howard", "Ward", "Cox", "Diaz",
    "Richardson", "Wood", "Watson", "Brooks", "Bennett", "Gray", "James", "Reyes",
]


class GenerateFakeMembersEndpoint(BaseAPIView):
    """
    Development-only endpoint to generate fake workspace members for testing.
    Only works when DEBUG=True.
    """

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def post(self, request, slug):
        # Security check: only allow in development mode from localhost
        if not is_dev_mode(request):
            return Response(
                {"error": "This endpoint is only available in local development mode"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get the number of users to create (default 5, max 50)
        count = min(int(request.data.get("count", 5)), 50)
        if count < 1:
            count = 1

        # Get the workspace
        try:
            workspace = Workspace.objects.get(slug=slug)
        except Workspace.DoesNotExist:
            return Response(
                {"error": "Workspace not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        created_users = []

        with transaction.atomic():
            for i in range(count):
                # Generate unique identifier
                unique_id = uuid.uuid4().hex[:8]

                # Pick random names
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)

                # Create email with unique identifier to avoid collisions
                email = f"fake-{unique_id}@example.dev"
                username = f"fake-user-{unique_id}"
                display_name = f"{first_name} {last_name}"

                # Create the user
                user = User.objects.create(
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    display_name=display_name,
                    is_active=True,
                    is_email_verified=True,
                    is_password_autoset=True,  # Mark as no password set
                )

                # Create associated profile
                Profile.objects.create(
                    user=user,
                    is_onboarded=True,
                )

                # Add user to workspace as a Member (role=15)
                workspace_member = WorkspaceMember.objects.create(
                    workspace=workspace,
                    member=user,
                    role=15,  # Member role
                )

                created_users.append({
                    "id": str(user.id),
                    "email": user.email,
                    "display_name": user.display_name,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                })

        return Response(
            {
                "message": f"Successfully created {len(created_users)} fake member(s)",
                "users": created_users,
            },
            status=status.HTTP_201_CREATED,
        )

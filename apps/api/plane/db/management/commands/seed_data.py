"""
seed_data management command

Seeds the database with test data for development and testing.
Non-interactive - suitable for CI/CD and automated setup.

Usage:
    python manage.py seed_data
    python manage.py seed_data --email=custom@example.com
    python manage.py seed_data --mode=random --issues=100
    python manage.py seed_data --workspace="My Workspace"
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from faker import Faker

from plane.db.models import (
    Epic,
    EpicIssue,
    Intake,
    IntakeIssue,
    Issue,
    IssueActivity,
    IssueAssignee,
    IssueLabel,
    IssueSequence,
    Label,
    Page,
    PageLabel,
    ProjectPage,
    Project,
    ProjectMember,
    Sprint,
    SprintIssue,
    State,
    User,
    Workspace,
    WorkspaceMember,
)
from plane.db.models.view import IssueView
from plane.db.models.wiki import WikiPage
from plane.db.models.webhook import Webhook
from plane.db.models.intake import SourceType


# Default test user credentials (matches UI hint in terms-and-conditions.tsx)
DEFAULT_EMAIL = "admin@admin.gov"
DEFAULT_PASSWORD = "admin123"
DEFAULT_WORKSPACE = "Test Workspace"
DEFAULT_WORKSPACE_SLUG = "test-workspace"

# Path to seed data JSON files
SEEDS_DIR = Path(__file__).parent.parent.parent.parent / "seeds" / "data"


class Command(BaseCommand):
    help = "Seed the database with test data for development"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=DEFAULT_EMAIL,
            help=f"Email for the test user (default: {DEFAULT_EMAIL})",
        )
        parser.add_argument(
            "--password",
            type=str,
            default=DEFAULT_PASSWORD,
            help="Password for the test user (default: password123)",
        )
        parser.add_argument(
            "--workspace",
            type=str,
            default=DEFAULT_WORKSPACE,
            help=f"Workspace name (default: {DEFAULT_WORKSPACE})",
        )
        parser.add_argument(
            "--mode",
            type=str,
            choices=["demo", "random"],
            default="demo",
            help="Seed mode: 'demo' uses curated JSON data, 'random' generates with Faker",
        )
        parser.add_argument(
            "--issues",
            type=int,
            default=20,
            help="Number of issues to create (random mode only)",
        )
        parser.add_argument(
            "--sprints",
            type=int,
            default=5,
            help="Number of sprints to create (random mode only)",
        )
        parser.add_argument(
            "--epics",
            type=int,
            default=5,
            help="Number of epics to create (random mode only)",
        )
        parser.add_argument(
            "--pages",
            type=int,
            default=10,
            help="Number of pages to create (random mode only)",
        )
        parser.add_argument(
            "--views",
            type=int,
            default=5,
            help="Number of views to create (random mode only)",
        )
        parser.add_argument(
            "--wiki-pages",
            type=int,
            default=5,
            help="Number of wiki pages to create (random mode only)",
        )
        parser.add_argument(
            "--webhooks",
            type=int,
            default=2,
            help="Number of webhooks to create (random mode only)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force seeding even if data already exists",
        )

    def handle(self, *args: Any, **options: Any) -> str | None:
        email = options["email"]
        password = options["password"]
        workspace_name = options["workspace"]
        mode = options["mode"]
        force = options["force"]

        self.stdout.write(self.style.NOTICE(f"Seeding database in '{mode}' mode..."))

        # Create workspace slug from name
        workspace_slug = workspace_name.lower().replace(" ", "-")

        # Handle --force deletion OUTSIDE the main transaction
        # This ensures the unique constraint is released before we try to create
        # Use all_objects to bypass soft-delete filtering
        existing = Workspace.all_objects.filter(slug=workspace_slug).first()
        if existing:
            if not force:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Workspace '{workspace_slug}' already exists. Use --force to overwrite."
                    )
                )
                return
            else:
                self.stdout.write(
                    self.style.WARNING(f"  Deleting existing workspace '{workspace_slug}'...")
                )
                # Use hard_delete to bypass soft-delete and actually remove the record
                # This handles both active and soft-deleted workspaces
                Workspace.all_objects.filter(slug=workspace_slug).delete()
                self.stdout.write(self.style.SUCCESS(f"  Deleted existing workspace."))

        try:
            with transaction.atomic():
                # Create or get user
                user = self._get_or_create_user(email, password)
                self.stdout.write(self.style.SUCCESS(f"  User: {user.email}"))

                # Create workspace
                workspace = self._create_workspace(workspace_name, workspace_slug, user)
                self.stdout.write(self.style.SUCCESS(f"  Workspace: {workspace.name} ({workspace.slug})"))

                # Seed based on mode
                if mode == "demo":
                    self._seed_demo_data(workspace, user)
                else:
                    self._seed_random_data(workspace, user, options)

            self.stdout.write(self.style.SUCCESS("\nSeeding completed successfully!"))
            self.stdout.write(f"\n  Login with: {email} / {password}")
            self.stdout.write(f"  Workspace: {workspace_slug}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Seeding failed: {str(e)}"))
            raise CommandError(str(e))

    def _get_or_create_user(self, email: str, password: str) -> User:
        """Get existing user or create a new one."""
        from plane.db.models.user import Profile

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": "Test",
                "last_name": "User",
                "is_active": True,
                "is_email_verified": True,
                "is_password_autoset": False,
                "status": "active",  # Shadow user pattern: active status for real users
            },
        )
        if created:
            user.set_password(password)
            user.save()

        # Create or update Profile with onboarding complete
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.is_onboarded = True
        profile.is_tour_completed = True
        profile.save()

        return user

    def _create_invited_users(self, workspace: Workspace, user: User, count: int = 3) -> list:
        """Create sample invited (shadow) users for testing the pending member feature."""
        from plane.db.models.user import UserStatusChoices
        import secrets

        fake = Faker()
        invited_users = []

        for i in range(count):
            email = f"invited{i+1}@example.gov"
            username = f"invited{i+1}_{uuid.uuid4().hex[:8]}"

            invited_user = User.objects.create(
                email=email,
                username=username,
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                is_active=False,  # Cannot login until invitation accepted
                status=UserStatusChoices.INVITED,
                invited_at=datetime.now(),
                invited_by=user,
                invitation_token=secrets.token_urlsafe(32),
            )

            # Create workspace membership for invited user
            WorkspaceMember.objects.create(
                workspace=workspace,
                member=invited_user,
                role=15,  # Member role
            )

            invited_users.append(invited_user)

        return invited_users

    def _create_workspace(self, name: str, slug: str, owner: User) -> Workspace:
        """Create a workspace with the owner as admin member."""
        workspace = Workspace.objects.create(
            name=name,
            slug=slug,
            owner=owner,
        )
        WorkspaceMember.objects.create(
            workspace=workspace,
            member=owner,
            role=20,  # Admin role
        )
        return workspace

    def _seed_demo_data(self, workspace: Workspace, user: User):
        """Seed using curated JSON data from seeds/data/."""
        self.stdout.write("  Loading demo data from JSON files...")

        # Load JSON files
        projects_data = self._load_json("projects.json")
        states_data = self._load_json("states.json")
        labels_data = self._load_json("labels.json")
        sprints_data = self._load_json("sprints.json")
        epics_data = self._load_json("epics.json")
        issues_data = self._load_json("issues.json")
        pages_data = self._load_json("pages.json")
        views_data = self._load_json("views.json")

        # Create project
        project_info = projects_data[0] if projects_data else {
            "name": "Demo Project",
            "identifier": "DEMO",
            "description": "A demo project for testing",
        }
        project = self._create_project(workspace, user, project_info)
        self.stdout.write(self.style.SUCCESS(f"    Project: {project.name}"))

        # Create states (mapping old IDs to new)
        state_map = self._create_states(workspace, project, user, states_data)
        self.stdout.write(f"    States: {len(state_map)}")

        # Create labels (mapping old IDs to new)
        label_map = self._create_labels(workspace, project, user, labels_data)
        self.stdout.write(f"    Labels: {len(label_map)}")

        # Create sprints (mapping old IDs to new)
        sprint_map = self._create_sprints(workspace, project, user, sprints_data)
        self.stdout.write(f"    Sprints: {len(sprint_map)}")

        # Create epics (mapping old IDs to new)
        epic_map = self._create_epics(workspace, project, user, epics_data)
        self.stdout.write(f"    Epics: {len(epic_map)}")

        # Create issues with relationships
        issue_count = self._create_issues(
            workspace, project, user, issues_data, state_map, label_map, sprint_map, epic_map
        )
        self.stdout.write(f"    Issues: {issue_count}")

        # Create pages
        page_count = self._create_pages(workspace, project, user, pages_data, label_map)
        self.stdout.write(f"    Pages: {page_count}")

        # Create views
        view_count = self._create_default_views(workspace, project, user)
        self.stdout.write(f"    Views: {view_count}")

        # Create wiki pages
        wiki_count = self._create_default_wiki_pages(workspace, user)
        self.stdout.write(f"    Wiki pages: {wiki_count}")

        # Create invited (shadow) users for testing pending member feature
        invited_users = self._create_invited_users(workspace, user, count=3)
        self.stdout.write(f"    Invited users: {len(invited_users)}")

        # Create webhooks
        webhook_count = self._create_default_webhooks(workspace, user)
        self.stdout.write(f"    Webhooks: {webhook_count}")

    def _seed_random_data(self, workspace: Workspace, user: User, options: dict):
        """Seed using Faker-generated random data."""
        self.stdout.write("  Generating random data with Faker...")
        fake = Faker()

        # Create project
        project_info = {
            "name": fake.company(),
            "identifier": fake.lexify(text="???").upper(),
            "description": fake.paragraph(),
        }
        project = self._create_project(workspace, user, project_info)
        self.stdout.write(self.style.SUCCESS(f"    Project: {project.name}"))

        # Create states
        states = self._create_default_states(workspace, project, user)
        self.stdout.write(f"    States: {len(states)}")

        # Create labels
        labels = self._create_random_labels(workspace, project, user, 10)
        self.stdout.write(f"    Labels: {len(labels)}")

        # Create sprints
        sprints = self._create_random_sprints(workspace, project, user, options["sprints"])
        self.stdout.write(f"    Sprints: {len(sprints)}")

        # Create epics
        epics = self._create_random_epics(workspace, project, user, options["epics"])
        self.stdout.write(f"    Epics: {len(epics)}")

        # Create issues
        issues = self._create_random_issues(
            workspace, project, user, options["issues"], states, labels, sprints, epics
        )
        self.stdout.write(f"    Issues: {len(issues)}")

        # Create pages
        pages = self._create_random_pages(workspace, project, user, options["pages"], labels)
        self.stdout.write(f"    Pages: {len(pages)}")

        # Create views
        views = self._create_random_views(workspace, project, user, options["views"])
        self.stdout.write(f"    Views: {len(views)}")

        # Create wiki pages
        wiki_pages = self._create_random_wiki_pages(workspace, user, options["wiki_pages"])
        self.stdout.write(f"    Wiki pages: {len(wiki_pages)}")

        # Create invited (shadow) users for testing pending member feature
        invited_users = self._create_invited_users(workspace, user, count=3)
        self.stdout.write(f"    Invited users: {len(invited_users)}")

        # Create webhooks
        webhooks = self._create_random_webhooks(workspace, user, options["webhooks"])
        self.stdout.write(f"    Webhooks: {len(webhooks)}")

    def _load_json(self, filename: str) -> list:
        """Load JSON file from seeds/data directory."""
        filepath = SEEDS_DIR / filename
        if not filepath.exists():
            return []
        with open(filepath) as f:
            return json.load(f)

    def _create_project(self, workspace: Workspace, user: User, info: dict) -> Project:
        """Create a project with the user as admin member."""
        project = Project.objects.create(
            workspace=workspace,
            name=info.get("name", "Demo Project"),
            identifier=info.get("identifier", "DEMO")[:12].upper(),
            description=info.get("description", ""),
            network=info.get("network", 2),
            created_by=user,
            intake_view=True,
        )
        ProjectMember.objects.create(
            project=project,
            workspace=workspace,
            member=user,
            role=20,
        )
        return project

    def _create_states(self, workspace, project, user, states_data) -> dict:
        """Create states from JSON data and return ID mapping."""
        state_map = {}
        for state_info in states_data:
            state = State.objects.create(
                workspace=workspace,
                project=project,
                name=state_info["name"],
                color=state_info.get("color", "#808080"),
                sequence=state_info.get("sequence", 10000),
                group=state_info.get("group", "backlog"),
                default=state_info.get("default", False),
                created_by=user,
            )
            state_map[state_info["id"]] = state.id
        return state_map

    def _create_default_states(self, workspace, project, user) -> list:
        """Create default states for random mode."""
        states_data = [
            {"name": "Backlog", "color": "#A3A3A3", "sequence": 15000, "group": "backlog", "default": True},
            {"name": "Todo", "color": "#3A3A3A", "sequence": 25000, "group": "unstarted"},
            {"name": "In Progress", "color": "#F59E0B", "sequence": 35000, "group": "started"},
            {"name": "Done", "color": "#16A34A", "sequence": 45000, "group": "completed"},
            {"name": "Cancelled", "color": "#EF4444", "sequence": 55000, "group": "cancelled"},
        ]
        states = []
        for state_info in states_data:
            states.append(
                State.objects.create(
                    workspace=workspace,
                    project=project,
                    name=state_info["name"],
                    color=state_info["color"],
                    sequence=state_info["sequence"],
                    group=state_info["group"],
                    default=state_info.get("default", False),
                    created_by=user,
                )
            )
        return states

    def _create_labels(self, workspace, project, user, labels_data) -> dict:
        """Create labels from JSON data and return ID mapping."""
        label_map = {}
        for label_info in labels_data:
            label = Label.objects.create(
                workspace=workspace,
                project=project,
                name=label_info["name"],
                color=label_info.get("color", "#808080"),
                created_by=user,
            )
            label_map[label_info["id"]] = label.id
        return label_map

    def _create_random_labels(self, workspace, project, user, count: int) -> list:
        """Create random labels using Faker."""
        fake = Faker()
        labels = []
        for _ in range(count):
            labels.append(
                Label.objects.create(
                    workspace=workspace,
                    project=project,
                    name=fake.word().capitalize(),
                    color=fake.hex_color(),
                    created_by=user,
                )
            )
        return labels

    def _create_sprints(self, workspace, project, user, sprints_data) -> dict:
        """Create sprints from JSON data and return ID mapping.

        Note: Sprints are now workspace-wide with a 'number' field,
        not project-specific with an 'owned_by' field.
        """
        from django.utils import timezone

        sprint_map = {}
        # Get the next sprint number for this workspace
        existing_max = Sprint.objects.filter(workspace=workspace).order_by('-number').first()
        next_number = (existing_max.number + 1) if existing_max else 1

        for i, sprint_info in enumerate(sprints_data):
            # Convert date strings to datetime if needed
            start_date = sprint_info.get("start_date")
            if start_date and isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            elif not start_date:
                # Default: start from today, each sprint 14 days apart
                start_date = timezone.now() + timedelta(days=i * 14)

            # End date is always start + 13 days (14-day sprint)
            if isinstance(start_date, datetime):
                end_date = start_date + timedelta(days=13)
            else:
                start_date = timezone.now() + timedelta(days=i * 14)
                end_date = start_date + timedelta(days=13)

            sprint = Sprint.objects.create(
                workspace=workspace,
                number=next_number + i,
                name=sprint_info.get("name", f"Sprint {next_number + i}"),
                start_date=start_date,
                end_date=end_date,
            )
            sprint_map[sprint_info["id"]] = sprint.id
        return sprint_map

    def _create_random_sprints(self, workspace, project, user, count: int) -> list:
        """Create random sprints using Faker.

        Note: Sprints are now workspace-wide with fixed 14-day duration.
        """
        from django.utils import timezone

        sprints = []
        # Get the next sprint number for this workspace
        existing_max = Sprint.objects.filter(workspace=workspace).order_by('-number').first()
        next_number = (existing_max.number + 1) if existing_max else 1

        for i in range(count):
            start_date = timezone.now() + timedelta(days=i * 14)
            end_date = start_date + timedelta(days=13)
            sprints.append(
                Sprint.objects.create(
                    workspace=workspace,
                    number=next_number + i,
                    name=f"Sprint {next_number + i}",
                    start_date=start_date,
                    end_date=end_date,
                )
            )
        return sprints

    def _create_epics(self, workspace, project, user, epics_data) -> dict:
        """Create epics from JSON data and return ID mapping."""
        epic_map = {}
        for epic_info in epics_data:
            epic = Epic.objects.create(
                workspace=workspace,
                project=project,
                name=epic_info["name"],
                start_date=epic_info.get("start_date"),
                target_date=epic_info.get("target_date"),
            )
            epic_map[epic_info["id"]] = epic.id
        return epic_map

    def _create_random_epics(self, workspace, project, user, count: int) -> list:
        """Create random epics using Faker."""
        fake = Faker()
        epics = []
        for _ in range(count):
            epics.append(
                Epic.objects.create(
                    workspace=workspace,
                    project=project,
                    name=fake.catch_phrase(),
                )
            )
        return epics

    def _create_issues(
        self, workspace, project, user, issues_data, state_map, label_map, sprint_map, epic_map
    ) -> int:
        """Create issues from JSON data with all relationships."""
        count = 0
        for issue_info in issues_data:
            # Get mapped state ID
            old_state_id = issue_info.get("state_id")
            state_id = state_map.get(old_state_id) if old_state_id else None

            # If no state mapping, get default state
            if not state_id:
                default_state = State.objects.filter(project=project, default=True).first()
                state_id = default_state.id if default_state else None

            issue = Issue.objects.create(
                workspace=workspace,
                project=project,
                name=issue_info["name"],
                description_html=issue_info.get("description_html", ""),
                description_stripped=issue_info.get("description_stripped", ""),
                sequence_id=issue_info.get("sequence_id", count + 1),
                sort_order=issue_info.get("sort_order", (count + 1) * 1000),
                state_id=state_id,
                priority=issue_info.get("priority", "none"),
                created_by=user,
            )

            # Create issue sequence
            IssueSequence.objects.create(
                issue=issue,
                sequence=issue.sequence_id,
                project=project,
                workspace=workspace,
            )

            # Create issue activity
            IssueActivity.objects.create(
                issue=issue,
                actor=user,
                project=project,
                workspace=workspace,
                comment="created the issue",
                verb="created",
                created_by=user,
            )

            # Add labels
            for old_label_id in issue_info.get("labels", []):
                label_id = label_map.get(old_label_id)
                if label_id:
                    IssueLabel.objects.create(
                        issue=issue,
                        label_id=label_id,
                        project=project,
                        workspace=workspace,
                    )

            # Add to sprint (SprintIssue auto-sets workspace from sprint)
            old_sprint_id = issue_info.get("sprint_id")
            if old_sprint_id:
                sprint_id = sprint_map.get(old_sprint_id)
                if sprint_id:
                    SprintIssue.objects.create(
                        issue=issue,
                        sprint_id=sprint_id,
                    )

            # Add to epics
            for old_epic_id in issue_info.get("epic_ids", []):
                epic_id = epic_map.get(old_epic_id)
                if epic_id:
                    EpicIssue.objects.create(
                        issue=issue,
                        epic_id=epic_id,
                        project=project,
                        workspace=workspace,
                    )

            count += 1

        return count

    def _create_random_issues(
        self, workspace, project, user, count: int, states, labels, sprints, epics
    ) -> list:
        """Create random issues using Faker."""
        fake = Faker()
        issues = []
        state_ids = [s.id for s in states]
        label_ids = [l.id for l in labels]
        sprint_ids = [s.id for s in sprints]
        epic_ids = [e.id for e in epics]

        for i in range(count):
            issue = Issue.objects.create(
                workspace=workspace,
                project=project,
                name=fake.sentence(nb_words=6),
                description_html=f"<p>{fake.paragraph()}</p>",
                description_stripped=fake.paragraph(),
                sequence_id=i + 1,
                sort_order=(i + 1) * 1000,
                state_id=random.choice(state_ids),
                priority=random.choice(["urgent", "high", "medium", "low", "none"]),
                created_by=user,
            )

            # Create issue sequence
            IssueSequence.objects.create(
                issue=issue,
                sequence=issue.sequence_id,
                project=project,
                workspace=workspace,
            )

            # Add random labels (0-3)
            for label_id in random.sample(label_ids, min(random.randint(0, 3), len(label_ids))):
                IssueLabel.objects.create(
                    issue=issue,
                    label_id=label_id,
                    project=project,
                    workspace=workspace,
                )

            # Add to random sprint (50% chance)
            if sprint_ids and random.random() > 0.5:
                SprintIssue.objects.create(
                    issue=issue,
                    sprint_id=random.choice(sprint_ids),
                )

            # Add to random epic (30% chance)
            if epic_ids and random.random() > 0.7:
                EpicIssue.objects.create(
                    issue=issue,
                    epic_id=random.choice(epic_ids),
                    project=project,
                    workspace=workspace,
                )

            issues.append(issue)

        return issues

    def _create_pages(self, workspace, project, user, pages_data, label_map) -> int:
        """Create pages from JSON data."""
        count = 0
        for page_info in pages_data:
            page = Page.objects.create(
                workspace=workspace,
                name=page_info["name"],
                description_html=page_info.get("description_html", ""),
                owned_by=user,
                access=page_info.get("access", 0),
                color=page_info.get("color") or "",  # color cannot be NULL
            )
            ProjectPage.objects.create(
                page=page,
                project=project,
                workspace=workspace,
            )
            count += 1
        return count

    def _create_random_pages(self, workspace, project, user, count: int, labels) -> list:
        """Create random pages using Faker."""
        fake = Faker()
        pages = []
        label_ids = [l.id for l in labels]

        for _ in range(count):
            page = Page.objects.create(
                workspace=workspace,
                name=fake.sentence(nb_words=4),
                description_html=f"<p>{fake.paragraphs(nb=3)}</p>",
                owned_by=user,
                access=random.choice([0, 1]),
                color=fake.hex_color(),
            )
            ProjectPage.objects.create(
                page=page,
                project=project,
                workspace=workspace,
            )

            # Add random labels (0-2)
            for label_id in random.sample(label_ids, min(random.randint(0, 2), len(label_ids))):
                PageLabel.objects.create(
                    page=page,
                    label_id=label_id,
                    workspace=workspace,
                )

            pages.append(page)

        return pages

    def _create_default_views(self, workspace, project, user) -> int:
        """Create default project views for demo data."""
        views_data = [
            {"name": "All Issues", "filters": {}, "display_filters": {"layout": "list"}},
            {"name": "Active Sprint", "filters": {}, "display_filters": {"layout": "spreadsheet"}},
            {"name": "My Issues", "filters": {"assignees": []}, "display_filters": {"layout": "kanban"}},
            {"name": "High Priority", "filters": {"priority": ["urgent", "high"]}, "display_filters": {"layout": "list"}},
            {"name": "Calendar View", "filters": {}, "display_filters": {"layout": "calendar"}},
        ]
        count = 0
        for view_info in views_data:
            IssueView.objects.create(
                workspace=workspace,
                project=project,
                name=view_info["name"],
                filters=view_info.get("filters", {}),
                display_filters=view_info.get("display_filters", {}),
                owned_by=user,
                access=1,  # Public
            )
            count += 1
        return count

    def _create_random_views(self, workspace, project, user, count: int) -> list:
        """Create random views using Faker."""
        fake = Faker()
        views = []
        layouts = ["list", "kanban", "calendar", "spreadsheet", "gantt"]

        for i in range(count):
            views.append(
                IssueView.objects.create(
                    workspace=workspace,
                    project=project,
                    name=f"{fake.word().capitalize()} View",
                    filters={},
                    display_filters={"layout": random.choice(layouts)},
                    owned_by=user,
                    access=random.choice([0, 1]),
                )
            )
        return views

    def _create_default_wiki_pages(self, workspace, user) -> int:
        """Create default wiki pages for demo data."""
        wiki_data = [
            {
                "name": "Getting Started",
                "description_html": "<h1>Getting Started</h1><p>Welcome to the wiki! This page helps you get started with the project.</p>",
            },
            {
                "name": "Architecture Overview",
                "description_html": "<h1>Architecture Overview</h1><p>This document describes the system architecture.</p>",
            },
            {
                "name": "API Reference",
                "description_html": "<h1>API Reference</h1><p>Comprehensive API documentation for developers.</p>",
            },
            {
                "name": "Development Guide",
                "description_html": "<h1>Development Guide</h1><p>Guide for setting up your development environment.</p>",
            },
            {
                "name": "Deployment Guide",
                "description_html": "<h1>Deployment Guide</h1><p>Instructions for deploying to production.</p>",
            },
        ]
        count = 0
        for wiki_info in wiki_data:
            WikiPage.objects.create(
                workspace=workspace,
                name=wiki_info["name"],
                description_html=wiki_info["description_html"],
                owned_by=user,
                access=WikiPage.SHARED_ACCESS,  # Shared with workspace
            )
            count += 1
        return count

    def _create_random_wiki_pages(self, workspace, user, count: int) -> list:
        """Create random wiki pages using Faker."""
        fake = Faker()
        wiki_pages = []

        for _ in range(count):
            wiki_pages.append(
                WikiPage.objects.create(
                    workspace=workspace,
                    name=fake.sentence(nb_words=4),
                    description_html=f"<h1>{fake.sentence()}</h1><p>{fake.paragraph(nb_sentences=5)}</p>",
                    owned_by=user,
                    access=WikiPage.SHARED_ACCESS,
                )
            )
        return wiki_pages

    def _create_default_webhooks(self, workspace, user) -> int:
        """Create default webhooks for demo data.

        Note: Webhooks require valid external URLs (not localhost).
        We use example.com which is a reserved domain for documentation.
        """
        webhooks_data = [
            {
                "url": "https://webhook.example.com/plane/issues",
                "issue": True,
                "issue_comment": True,
            },
            {
                "url": "https://webhook.example.com/plane/projects",
                "project": True,
                "sprint": True,
                "epic": True,
            },
        ]
        count = 0
        for webhook_info in webhooks_data:
            Webhook.objects.create(
                workspace=workspace,
                url=webhook_info["url"],
                is_active=True,
                project=webhook_info.get("project", False),
                issue=webhook_info.get("issue", False),
                epic=webhook_info.get("epic", False),
                sprint=webhook_info.get("sprint", False),
                issue_comment=webhook_info.get("issue_comment", False),
            )
            count += 1
        return count

    def _create_random_webhooks(self, workspace, user, count: int) -> list:
        """Create random webhooks.

        Note: Uses example.com domain which is reserved for documentation.
        Real webhooks would need actual endpoint URLs.
        """
        fake = Faker()
        webhooks = []

        for i in range(count):
            webhooks.append(
                Webhook.objects.create(
                    workspace=workspace,
                    url=f"https://webhook.example.com/{fake.slug()}/{i}",
                    is_active=True,
                    project=random.choice([True, False]),
                    issue=random.choice([True, False]),
                    epic=random.choice([True, False]),
                    sprint=random.choice([True, False]),
                    issue_comment=random.choice([True, False]),
                )
            )
        return webhooks

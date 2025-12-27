"""
Management command to create system properties for all workspaces.

System properties are the default properties available for issue-type pages.
They cannot be deleted by users and define the core functionality of work items.

Usage:
    python manage.py create_system_properties
    python manage.py create_system_properties --workspace=<slug>
"""

from django.core.management import BaseCommand

from plane.db.models import PropertyDefinition, Workspace


# System property definitions
# Note: Status uses State FK on WikiPage (not a property) for performance
# Note: Labels and Assignees use M2M relationships (tech debt - will become properties later)
SYSTEM_PROPERTIES = [
    {
        "name": "Priority",
        "slug": "priority",
        "property_type": "select",
        "description": "Priority level of the work item",
        "page_types": ["issue", "task"],
        "sort_order": 100,
        "options": [
            {"id": "urgent", "label": "Urgent", "color": "#ef4444", "order": 1},
            {"id": "high", "label": "High", "color": "#f97316", "order": 2},
            {"id": "medium", "label": "Medium", "color": "#eab308", "order": 3},
            {"id": "low", "label": "Low", "color": "#22c55e", "order": 4},
            {"id": "none", "label": "None", "color": "#6b7280", "order": 5},
        ],
        "default_value": {"id": "none"},
    },
    {
        "name": "Start Date",
        "slug": "start_date",
        "property_type": "date",
        "description": "When work on this item should begin",
        "page_types": ["issue", "task", "epic"],
        "sort_order": 200,
        "options": [],
        "default_value": None,
    },
    {
        "name": "Target Date",
        "slug": "target_date",
        "property_type": "date",
        "description": "When this item should be completed",
        "page_types": ["issue", "task", "epic"],
        "sort_order": 300,
        "options": [],
        "default_value": None,
    },
    {
        "name": "Estimate",
        "slug": "estimate",
        "property_type": "number",
        "description": "Estimated effort (points or hours)",
        "page_types": ["issue", "task"],
        "sort_order": 400,
        "options": [],
        "default_value": None,
    },
]


class Command(BaseCommand):
    help = "Create system properties for all workspaces"

    def add_arguments(self, parser):
        parser.add_argument(
            "--workspace",
            type=str,
            help="Create properties for a specific workspace (by slug)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Update existing system properties even if they already exist",
        )

    def handle(self, *args, **options):
        workspace_slug = options.get("workspace")
        force_update = options.get("force", False)

        if workspace_slug:
            workspaces = Workspace.objects.filter(slug=workspace_slug)
            if not workspaces.exists():
                self.stderr.write(
                    self.style.ERROR(f"Workspace '{workspace_slug}' not found")
                )
                return
        else:
            workspaces = Workspace.objects.all()

        total_created = 0
        total_updated = 0
        total_skipped = 0

        for workspace in workspaces:
            created, updated, skipped = self._create_properties_for_workspace(
                workspace, force_update
            )
            total_created += created
            total_updated += updated
            total_skipped += skipped

        self.stdout.write(
            self.style.SUCCESS(
                f"System properties created: {total_created}, "
                f"updated: {total_updated}, skipped: {total_skipped}"
            )
        )

    def _create_properties_for_workspace(self, workspace, force_update):
        """Create or update system properties for a single workspace."""
        created = 0
        updated = 0
        skipped = 0

        for prop_def in SYSTEM_PROPERTIES:
            existing = PropertyDefinition.objects.filter(
                workspace=workspace,
                slug=prop_def["slug"],
                deleted_at__isnull=True,
            ).first()

            if existing:
                if force_update:
                    # Update existing property
                    existing.name = prop_def["name"]
                    existing.property_type = prop_def["property_type"]
                    existing.description = prop_def["description"]
                    existing.page_types = prop_def["page_types"]
                    existing.sort_order = prop_def["sort_order"]
                    existing.options = prop_def["options"]
                    existing.default_value = prop_def["default_value"]
                    existing.is_system = True
                    existing.save()
                    updated += 1
                    self.stdout.write(
                        f"  Updated: {workspace.name} - {prop_def['name']}"
                    )
                else:
                    skipped += 1
                    self.stdout.write(
                        f"  Skipped (exists): {workspace.name} - {prop_def['name']}"
                    )
            else:
                # Create new property
                PropertyDefinition.objects.create(
                    workspace=workspace,
                    name=prop_def["name"],
                    slug=prop_def["slug"],
                    property_type=prop_def["property_type"],
                    description=prop_def["description"],
                    page_types=prop_def["page_types"],
                    sort_order=prop_def["sort_order"],
                    options=prop_def["options"],
                    default_value=prop_def["default_value"],
                    is_system=True,
                )
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Created: {workspace.name} - {prop_def['name']}"
                    )
                )

        return created, updated, skipped

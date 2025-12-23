# Django imports
from typing import Any
from django.core.management import BaseCommand
from django.db import transaction

# Package imports
from plane.db.models import Workspace, WorkspaceMember


class Command(BaseCommand):
    help = "Fix workspaces where the owner is not a member. Creates WorkspaceMember records with role=20 (owner)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be fixed without making changes",
        )
        parser.add_argument(
            "--workspace-slug",
            type=str,
            help="Fix only a specific workspace by slug",
        )

    def handle(self, *args: Any, **options: Any):
        dry_run = options.get("dry_run", False)
        workspace_slug = options.get("workspace_slug")

        # Find workspaces where the owner is not a member
        workspaces = Workspace.objects.select_related("owner").all()

        if workspace_slug:
            workspaces = workspaces.filter(slug__iexact=workspace_slug)

        fixed_count = 0
        skipped_count = 0

        for workspace in workspaces:
            if not workspace.owner:
                self.stdout.write(
                    self.style.WARNING(f"Workspace '{workspace.name}' ({workspace.slug}) has no owner - skipping")
                )
                skipped_count += 1
                continue

            # Check if owner is already a member
            member_exists = WorkspaceMember.objects.filter(
                workspace=workspace,
                member=workspace.owner,
                is_active=True,
            ).exists()

            if member_exists:
                if workspace_slug:  # Only show detail if checking specific workspace
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Workspace '{workspace.name}' ({workspace.slug}) - owner {workspace.owner.email} is already a member"
                        )
                    )
                skipped_count += 1
                continue

            # Owner is not a member - fix it
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"[DRY RUN] Would add owner {workspace.owner.email} as member of workspace '{workspace.name}' ({workspace.slug})"
                    )
                )
            else:
                with transaction.atomic():
                    # Check for soft-deleted membership and reactivate, or create new
                    existing_inactive = WorkspaceMember.objects.filter(
                        workspace=workspace,
                        member=workspace.owner,
                        is_active=False,
                    ).first()

                    if existing_inactive:
                        existing_inactive.is_active = True
                        existing_inactive.role = 20
                        existing_inactive.save()
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Reactivated owner {workspace.owner.email} as member of workspace '{workspace.name}' ({workspace.slug})"
                            )
                        )
                    else:
                        WorkspaceMember.objects.create(
                            workspace=workspace,
                            member=workspace.owner,
                            role=20,
                        )
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Added owner {workspace.owner.email} as member of workspace '{workspace.name}' ({workspace.slug})"
                            )
                        )

            fixed_count += 1

        # Summary
        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.WARNING(f"[DRY RUN] Would fix {fixed_count} workspace(s)"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Fixed {fixed_count} workspace(s)"))
        self.stdout.write(f"Skipped {skipped_count} workspace(s) (already correct or no owner)")

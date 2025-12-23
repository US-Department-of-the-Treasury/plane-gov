"""
db_reset management command

Flushes the database and re-seeds with fresh test data.
Only works in DEBUG mode for safety.

Usage:
    python manage.py db_reset --confirm
    python manage.py db_reset --confirm --mode=random --issues=100
"""

from typing import Any

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Flush the database and re-seed with test data (DEBUG mode only)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            required=True,
            help="Confirm that you want to wipe all data (required)",
        )
        parser.add_argument(
            "--email",
            type=str,
            default="test@example.com",
            help="Email for the test user (default: test@example.com)",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="password123",
            help="Password for the test user (default: password123)",
        )
        parser.add_argument(
            "--workspace",
            type=str,
            default="Test Workspace",
            help="Workspace name (default: Test Workspace)",
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
            "--skip-seed",
            action="store_true",
            help="Only flush the database, don't seed new data",
        )

    def handle(self, *args: Any, **options: Any) -> str | None:
        # Safety check - only allow in DEBUG mode
        if not settings.DEBUG:
            raise CommandError(
                "db_reset is only allowed in DEBUG mode! "
                "Set DEBUG=True in your environment to use this command."
            )

        if not options["confirm"]:
            raise CommandError("You must pass --confirm to acknowledge data deletion.")

        self.stdout.write(self.style.WARNING("\n" + "=" * 60))
        self.stdout.write(self.style.WARNING("  DATABASE RESET"))
        self.stdout.write(self.style.WARNING("=" * 60))
        self.stdout.write("")

        try:
            # Step 1: Flush the database
            self.stdout.write(self.style.NOTICE("Step 1: Flushing database..."))
            call_command("flush", "--no-input", verbosity=0)
            self.stdout.write(self.style.SUCCESS("  Database flushed."))

            # Step 2: Re-run migrations (in case flush removed migration state)
            self.stdout.write(self.style.NOTICE("Step 2: Applying migrations..."))
            call_command("migrate", "--no-input", verbosity=0)
            self.stdout.write(self.style.SUCCESS("  Migrations applied."))

            # Step 2b: Register instance and configure auth
            self.stdout.write(self.style.NOTICE("Step 2b: Configuring instance..."))
            call_command("register_instance", "local-dev", verbosity=0)
            call_command("configure_instance", verbosity=0)

            # Mark instance setup as complete (required for login to work)
            from plane.license.models import Instance

            instance = Instance.objects.first()
            if instance:
                instance.is_setup_done = True
                instance.save()
            self.stdout.write(self.style.SUCCESS("  Instance configured."))

            # Step 3: Seed data (unless --skip-seed)
            if not options["skip_seed"]:
                self.stdout.write(self.style.NOTICE("Step 3: Seeding test data..."))
                seed_options = {
                    "email": options["email"],
                    "password": options["password"],
                    "workspace": options["workspace"],
                    "mode": options["mode"],
                    "issues": options["issues"],
                    "sprints": options["sprints"],
                    "epics": options["epics"],
                    "pages": options["pages"],
                    "views": options["views"],
                    "wiki_pages": options["wiki_pages"],
                    "webhooks": options["webhooks"],
                    "force": True,  # Always force since we just flushed
                }
                call_command("seed_data", **seed_options)
            else:
                self.stdout.write(self.style.NOTICE("Step 3: Skipping seed (--skip-seed)"))

            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS("=" * 60))
            self.stdout.write(self.style.SUCCESS("  DATABASE RESET COMPLETE"))
            self.stdout.write(self.style.SUCCESS("=" * 60))

            if not options["skip_seed"]:
                self.stdout.write("")
                self.stdout.write(f"  Login: {options['email']} / {options['password']}")
                self.stdout.write(f"  Workspace: {options['workspace'].lower().replace(' ', '-')}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\nReset failed: {str(e)}"))
            raise CommandError(str(e))

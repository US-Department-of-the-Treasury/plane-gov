# migrate_with_lock.py
# Runs Django migrations with PostgreSQL advisory lock for safety
# This provides defense-in-depth when combined with EB's leader_only: true
#
# Why this exists:
# - EB's leader_only is ~95% reliable but not guaranteed
# - During rolling deployments, instance replacements, or edge cases,
#   multiple instances may attempt to run migrations
# - PostgreSQL advisory locks provide a database-level guarantee that
#   only one process can run migrations at a time
#
# Usage:
#   python manage.py migrate_with_lock
#
# In .ebextensions:
#   container_commands:
#     01_migrate:
#       command: "python manage.py migrate_with_lock"
#       leader_only: true

import hashlib
import sys
import time

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection


class Command(BaseCommand):
    help = "Run migrations with PostgreSQL advisory lock to prevent race conditions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--timeout",
            type=int,
            default=300,
            help="Max seconds to wait for lock (default: 300)",
        )
        parser.add_argument(
            "--skip-if-locked",
            action="store_true",
            help="Skip migrations if another process holds the lock (don't wait)",
        )

    def handle(self, *args, **options):
        # Generate a consistent lock ID from a known string
        # Using md5 hash to get a large integer that fits PostgreSQL bigint
        lock_id = int(hashlib.md5(b"plane_django_migrations").hexdigest()[:15], 16)

        timeout = options["timeout"]
        skip_if_locked = options["skip_if_locked"]

        self.stdout.write(f"Attempting to acquire migration lock (ID: {lock_id})...")

        with connection.cursor() as cursor:
            if skip_if_locked:
                # Non-blocking: try once and skip if locked
                cursor.execute("SELECT pg_try_advisory_lock(%s)", [lock_id])
                acquired = cursor.fetchone()[0]

                if not acquired:
                    self.stdout.write(
                        self.style.WARNING(
                            "Another instance is running migrations. Skipping."
                        )
                    )
                    # Wait briefly then verify migrations are applied
                    time.sleep(10)
                    self._verify_migrations()
                    return
            else:
                # Blocking with timeout: wait up to timeout seconds
                acquired = self._acquire_lock_with_timeout(cursor, lock_id, timeout)

                if not acquired:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Could not acquire migration lock after {timeout}s. Aborting."
                        )
                    )
                    sys.exit(1)

            # We have the lock - run migrations
            try:
                self.stdout.write(
                    self.style.SUCCESS("Acquired migration lock. Running migrations...")
                )
                call_command("migrate", "--noinput", verbosity=1)
                self.stdout.write(self.style.SUCCESS("Migrations completed successfully."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Migration failed: {e}"))
                raise
            finally:
                # Always release the lock
                cursor.execute("SELECT pg_advisory_unlock(%s)", [lock_id])
                self.stdout.write("Released migration lock.")

    def _acquire_lock_with_timeout(self, cursor, lock_id, timeout):
        """Try to acquire lock, waiting up to timeout seconds."""
        start_time = time.time()
        attempt = 0

        while time.time() - start_time < timeout:
            attempt += 1
            cursor.execute("SELECT pg_try_advisory_lock(%s)", [lock_id])
            acquired = cursor.fetchone()[0]

            if acquired:
                return True

            # Log every 30 seconds
            if attempt % 6 == 0:
                elapsed = int(time.time() - start_time)
                self.stdout.write(
                    f"Waiting for migration lock... ({elapsed}s elapsed)"
                )

            time.sleep(5)

        return False

    def _verify_migrations(self):
        """Verify all migrations are applied (used when skipping)."""
        self.stdout.write("Verifying migrations are applied...")
        try:
            call_command("migrate", "--check")
            self.stdout.write(self.style.SUCCESS("All migrations are applied."))
        except SystemExit:
            # migrate --check exits with code 1 if migrations are pending
            self.stdout.write(
                self.style.WARNING(
                    "Pending migrations detected. Another instance should apply them."
                )
            )

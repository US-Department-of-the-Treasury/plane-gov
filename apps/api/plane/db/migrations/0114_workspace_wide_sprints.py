# Migration to convert Sprint from project-based to workspace-wide
# This is a breaking change that deletes all existing sprint data

from django.db import migrations, models
import django.db.models.deletion


def delete_sprint_data(apps, schema_editor):
    """Delete all existing sprint data for fresh start with workspace-wide sprints."""
    Sprint = apps.get_model("db", "Sprint")
    SprintIssue = apps.get_model("db", "SprintIssue")
    SprintUserProperties = apps.get_model("db", "SprintUserProperties")
    DraftIssueSprint = apps.get_model("db", "DraftIssueSprint")

    # Delete in order to respect FK constraints
    DraftIssueSprint.objects.all().delete()
    SprintUserProperties.objects.all().delete()
    SprintIssue.objects.all().delete()
    Sprint.objects.all().delete()


class Migration(migrations.Migration):
    # Disable atomic mode to avoid "pending trigger events" error
    # when removing FKs and altering table in same transaction
    atomic = False

    dependencies = [
        ("db", "0113_rename_cycle_to_sprint"),
    ]

    operations = [
        # =================================
        # PHASE 1: Delete existing data
        # =================================
        migrations.RunPython(delete_sprint_data, migrations.RunPython.noop),

        # =================================
        # PHASE 2: Remove project FK from Sprint
        # =================================
        migrations.RemoveField(
            model_name="sprint",
            name="project",
        ),

        # =================================
        # PHASE 3: Remove owned_by from Sprint
        # =================================
        migrations.RemoveField(
            model_name="sprint",
            name="owned_by",
        ),

        # =================================
        # PHASE 4: Add number field to Sprint
        # =================================
        migrations.AddField(
            model_name="sprint",
            name="number",
            field=models.PositiveIntegerField(default=1, verbose_name="Sprint Number"),
            preserve_default=False,
        ),

        # =================================
        # PHASE 5: Add sprint_start_date to Workspace
        # =================================
        migrations.AddField(
            model_name="workspace",
            name="sprint_start_date",
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name="Sprint Start Date",
                help_text="The date when Sprint 1 begins. All sprints are 2 weeks from this date.",
            ),
        ),

        # =================================
        # PHASE 6: Update Sprint constraints
        # =================================
        # Add unique constraint for workspace + number
        migrations.AddConstraint(
            model_name="sprint",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["workspace", "number"],
                name="sprint_unique_workspace_number_when_deleted_at_null",
            ),
        ),

        # =================================
        # PHASE 7: Remove project from SprintIssue
        # =================================
        migrations.RemoveField(
            model_name="sprintissue",
            name="project",
        ),

        # =================================
        # PHASE 8: Remove project from SprintUserProperties
        # =================================
        migrations.RemoveField(
            model_name="sprintuserproperties",
            name="project",
        ),

        # =================================
        # PHASE 9: Update ordering for Sprint
        # =================================
        migrations.AlterModelOptions(
            name="sprint",
            options={
                "ordering": ("number",),
                "verbose_name": "Sprint",
                "verbose_name_plural": "Sprints",
            },
        ),
    ]

# Generated migration to rename Cycle to Sprint
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0112_auto_20251124_0603"),
    ]

    operations = [
        # ======================
        # PHASE 1: Rename Models
        # ======================
        migrations.RenameModel(
            old_name="Cycle",
            new_name="Sprint",
        ),
        migrations.RenameModel(
            old_name="CycleIssue",
            new_name="SprintIssue",
        ),
        migrations.RenameModel(
            old_name="CycleUserProperties",
            new_name="SprintUserProperties",
        ),
        migrations.RenameModel(
            old_name="DraftIssueCycle",
            new_name="DraftIssueSprint",
        ),

        # ========================
        # PHASE 2: Rename Tables
        # ========================
        migrations.AlterModelTable(
            name="sprint",
            table="sprints",
        ),
        migrations.AlterModelTable(
            name="sprintissue",
            table="sprint_issues",
        ),
        migrations.AlterModelTable(
            name="sprintuserproperties",
            table="sprint_user_properties",
        ),
        migrations.AlterModelTable(
            name="draftissuesprint",
            table="draft_issue_sprints",
        ),

        # ========================
        # PHASE 3: Rename Fields
        # ========================
        # Rename cycle field to sprint on SprintIssue
        migrations.RenameField(
            model_name="sprintissue",
            old_name="cycle",
            new_name="sprint",
        ),
        # Rename cycle field to sprint on SprintUserProperties
        migrations.RenameField(
            model_name="sprintuserproperties",
            old_name="cycle",
            new_name="sprint",
        ),
        # Rename cycle field to sprint on DraftIssueSprint
        migrations.RenameField(
            model_name="draftissuesprint",
            old_name="cycle",
            new_name="sprint",
        ),
        # Rename cycle_view to sprint_view on Project
        migrations.RenameField(
            model_name="project",
            old_name="cycle_view",
            new_name="sprint_view",
        ),
        # Rename cycle to sprint on Webhook
        migrations.RenameField(
            model_name="webhook",
            old_name="cycle",
            new_name="sprint",
        ),
        # Rename cycle to sprint on IssueVersion
        migrations.RenameField(
            model_name="issueversion",
            old_name="cycle",
            new_name="sprint",
        ),

        # ==============================
        # PHASE 4: Update Model Options
        # ==============================
        migrations.AlterModelOptions(
            name="sprint",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Sprint",
                "verbose_name_plural": "Sprints",
            },
        ),
        migrations.AlterModelOptions(
            name="sprintissue",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Sprint Issue",
                "verbose_name_plural": "Sprint Issues",
            },
        ),
        migrations.AlterModelOptions(
            name="sprintuserproperties",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Sprint User Property",
                "verbose_name_plural": "Sprint User Properties",
            },
        ),
        migrations.AlterModelOptions(
            name="draftissuesprint",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Draft Issue Sprint",
                "verbose_name_plural": "Draft Issue Sprints",
            },
        ),

        # ================================
        # PHASE 5: Remove Old Constraints
        # ================================
        migrations.RemoveConstraint(
            model_name="sprintissue",
            name="cycle_issue_when_deleted_at_null",
        ),
        migrations.RemoveConstraint(
            model_name="sprintuserproperties",
            name="cycle_user_properties_unique_cycle_user_when_deleted_at_null",
        ),
        migrations.RemoveConstraint(
            model_name="draftissuesprint",
            name="draft_issue_cycle_when_deleted_at_null",
        ),

        # ================================
        # PHASE 6: Add New Constraints
        # ================================
        migrations.AddConstraint(
            model_name="sprintissue",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["sprint", "issue"],
                name="sprint_issue_when_deleted_at_null",
            ),
        ),
        migrations.AddConstraint(
            model_name="sprintuserproperties",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["sprint", "user"],
                name="sprint_user_properties_unique_sprint_user_when_deleted_at_null",
            ),
        ),
        migrations.AddConstraint(
            model_name="draftissuesprint",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["draft_issue", "sprint"],
                name="draft_issue_sprint_when_deleted_at_null",
            ),
        ),
    ]

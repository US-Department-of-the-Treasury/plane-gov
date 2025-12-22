# Generated migration to rename Epic to Epic
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0113_rename_cycle_to_sprint"),
    ]

    operations = [
        # ======================
        # PHASE 1: Rename Models
        # ======================
        migrations.RenameModel(
            old_name="Epic",
            new_name="Epic",
        ),
        migrations.RenameModel(
            old_name="EpicMember",
            new_name="EpicMember",
        ),
        migrations.RenameModel(
            old_name="EpicIssue",
            new_name="EpicIssue",
        ),
        migrations.RenameModel(
            old_name="EpicLink",
            new_name="EpicLink",
        ),
        migrations.RenameModel(
            old_name="EpicUserProperties",
            new_name="EpicUserProperties",
        ),
        migrations.RenameModel(
            old_name="DraftIssueEpic",
            new_name="DraftIssueEpic",
        ),

        # ========================
        # PHASE 2: Rename Tables
        # ========================
        migrations.AlterModelTable(
            name="epic",
            table="epics",
        ),
        migrations.AlterModelTable(
            name="epicmember",
            table="epic_members",
        ),
        migrations.AlterModelTable(
            name="epicissue",
            table="epic_issues",
        ),
        migrations.AlterModelTable(
            name="epiclink",
            table="epic_links",
        ),
        migrations.AlterModelTable(
            name="epicuserproperties",
            table="epic_user_properties",
        ),
        migrations.AlterModelTable(
            name="draftissueepic",
            table="draft_issue_epics",
        ),

        # ========================
        # PHASE 3: Rename Fields
        # ========================
        # Rename epic field to epic on EpicMember
        migrations.RenameField(
            model_name="epicmember",
            old_name="epic",
            new_name="epic",
        ),
        # Rename epic field to epic on EpicIssue
        migrations.RenameField(
            model_name="epicissue",
            old_name="epic",
            new_name="epic",
        ),
        # Rename epic field to epic on EpicLink
        migrations.RenameField(
            model_name="epiclink",
            old_name="epic",
            new_name="epic",
        ),
        # Rename epic field to epic on EpicUserProperties
        migrations.RenameField(
            model_name="epicuserproperties",
            old_name="epic",
            new_name="epic",
        ),
        # Rename epic field to epic on DraftIssueEpic
        migrations.RenameField(
            model_name="draftissueepic",
            old_name="epic",
            new_name="epic",
        ),
        # Rename epic_view to epic_view on Project
        migrations.RenameField(
            model_name="project",
            old_name="epic_view",
            new_name="epic_view",
        ),
        # Rename epic to epic on Webhook
        migrations.RenameField(
            model_name="webhook",
            old_name="epic",
            new_name="epic",
        ),

        # ==============================
        # PHASE 4: Update Model Options
        # ==============================
        migrations.AlterModelOptions(
            name="epic",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Epic",
                "verbose_name_plural": "Epics",
            },
        ),
        migrations.AlterModelOptions(
            name="epicmember",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Epic Member",
                "verbose_name_plural": "Epic Members",
            },
        ),
        migrations.AlterModelOptions(
            name="epicissue",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Epic Issue",
                "verbose_name_plural": "Epic Issues",
            },
        ),
        migrations.AlterModelOptions(
            name="epiclink",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Epic Link",
                "verbose_name_plural": "Epic Links",
            },
        ),
        migrations.AlterModelOptions(
            name="epicuserproperties",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Epic User Property",
                "verbose_name_plural": "Epic User Properties",
            },
        ),
        migrations.AlterModelOptions(
            name="draftissueepic",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Draft Issue Epic",
                "verbose_name_plural": "Draft Issue Epics",
            },
        ),

        # ================================
        # PHASE 5: Remove Old Constraints
        # ================================
        migrations.RemoveConstraint(
            model_name="epic",
            name="module_unique_name_project_when_deleted_at_null",
        ),
        migrations.RemoveConstraint(
            model_name="epicmember",
            name="module_member_unique_module_member_when_deleted_at_null",
        ),
        migrations.RemoveConstraint(
            model_name="epicissue",
            name="module_issue_unique_issue_module_when_deleted_at_null",
        ),
        migrations.RemoveConstraint(
            model_name="epicuserproperties",
            name="module_user_properties_unique_module_user_when_deleted_at_null",
        ),
        migrations.RemoveConstraint(
            model_name="draftissueepic",
            name="module_draft_issue_unique_issue_module_when_deleted_at_null",
        ),

        # ================================
        # PHASE 6: Add New Constraints
        # ================================
        migrations.AddConstraint(
            model_name="epic",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["name", "project"],
                name="epic_unique_name_project_when_deleted_at_null",
            ),
        ),
        migrations.AddConstraint(
            model_name="epicmember",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["epic", "member"],
                name="epic_member_unique_epic_member_when_deleted_at_null",
            ),
        ),
        migrations.AddConstraint(
            model_name="epicissue",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["issue", "epic"],
                name="epic_issue_unique_issue_epic_when_deleted_at_null",
            ),
        ),
        migrations.AddConstraint(
            model_name="epicuserproperties",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["epic", "user"],
                name="epic_user_properties_unique_epic_user_when_deleted_at_null",
            ),
        ),
        migrations.AddConstraint(
            model_name="draftissueepic",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=["draft_issue", "epic"],
                name="epic_draft_issue_unique_issue_epic_when_deleted_at_null",
            ),
        ),
    ]

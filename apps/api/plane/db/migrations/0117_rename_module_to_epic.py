# Migration to rename Module to Epic
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0115_add_sprint_start_date_to_workspace"),
    ]

    operations = [
        # ======================
        # PHASE 1: Rename Tables
        # ======================
        migrations.AlterModelTable(
            name="module",
            table="epics",
        ),
        migrations.AlterModelTable(
            name="modulemember",
            table="epic_members",
        ),
        migrations.AlterModelTable(
            name="moduleissue",
            table="epic_issues",
        ),
        migrations.AlterModelTable(
            name="modulelink",
            table="epic_links",
        ),
        migrations.AlterModelTable(
            name="moduleuserproperties",
            table="epic_user_properties",
        ),
        migrations.AlterModelTable(
            name="draftissuemodule",
            table="draft_issue_epics",
        ),
        # ======================
        # PHASE 2: Rename Column
        # ======================
        migrations.RenameField(
            model_name="project",
            old_name="module_view",
            new_name="epic_view",
        ),
        # ======================
        # PHASE 3: Rename Models
        # ======================
        migrations.RenameModel(
            old_name="Module",
            new_name="Epic",
        ),
        migrations.RenameModel(
            old_name="ModuleMember",
            new_name="EpicMember",
        ),
        migrations.RenameModel(
            old_name="ModuleIssue",
            new_name="EpicIssue",
        ),
        migrations.RenameModel(
            old_name="ModuleLink",
            new_name="EpicLink",
        ),
        migrations.RenameModel(
            old_name="ModuleUserProperties",
            new_name="EpicUserProperties",
        ),
        migrations.RenameModel(
            old_name="DraftIssueModule",
            new_name="DraftIssueEpic",
        ),
    ]

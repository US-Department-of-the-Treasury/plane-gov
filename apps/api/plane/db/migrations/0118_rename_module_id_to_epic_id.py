# Migration to rename module_id columns to epic_id after table renames
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0117_rename_module_to_epic"),
    ]

    operations = [
        # Rename module_id to epic_id in all epic-related tables
        migrations.RenameField(
            model_name="epicmember",
            old_name="module",
            new_name="epic",
        ),
        migrations.RenameField(
            model_name="epicissue",
            old_name="module",
            new_name="epic",
        ),
        migrations.RenameField(
            model_name="epiclink",
            old_name="module",
            new_name="epic",
        ),
        migrations.RenameField(
            model_name="epicuserproperties",
            old_name="module",
            new_name="epic",
        ),
        migrations.RenameField(
            model_name="draftissueepic",
            old_name="module",
            new_name="epic",
        ),
    ]

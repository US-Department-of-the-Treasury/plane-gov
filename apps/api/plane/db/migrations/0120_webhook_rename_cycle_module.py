# Migration to rename module field to epic in webhooks
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0119_wiki_tables"),
    ]

    operations = [
        # Rename module to epic (cycle to sprint was done in 0113)
        migrations.RenameField(
            model_name="webhook",
            old_name="module",
            new_name="epic",
        ),
    ]

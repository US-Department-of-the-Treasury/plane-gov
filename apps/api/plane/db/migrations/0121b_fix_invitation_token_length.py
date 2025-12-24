# Generated manually to fix invitation_token column length

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('db', '0121_add_user_status_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='invitation_token',
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True),
        ),
    ]

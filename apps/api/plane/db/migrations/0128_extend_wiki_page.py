# Generated migration for WikiPage extensions
# Adds page_type, sequence_id, state FK, completed_at, labels M2M, assignees M2M

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("db", "0127_add_property_system"),
    ]

    operations = [
        # Add page_type field
        migrations.AddField(
            model_name="wikipage",
            name="page_type",
            field=models.CharField(
                choices=[
                    ("page", "Page"),
                    ("issue", "Issue"),
                    ("epic", "Epic"),
                    ("task", "Task"),
                ],
                db_index=True,
                default="page",
                help_text="Type of page: page (wiki), issue (work item), epic, task",
                max_length=50,
            ),
        ),
        # Add sequence_id field
        migrations.AddField(
            model_name="wikipage",
            name="sequence_id",
            field=models.IntegerField(
                blank=True,
                help_text="Sequence ID for issue-type pages (project-scoped, like PROJ-123)",
                null=True,
            ),
        ),
        # Add state FK field
        migrations.AddField(
            model_name="wikipage",
            name="state",
            field=models.ForeignKey(
                blank=True,
                help_text="State/status for issue-type pages",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="wiki_pages",
                to="db.state",
            ),
        ),
        # Add completed_at field
        migrations.AddField(
            model_name="wikipage",
            name="completed_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When this issue-type page was completed",
                null=True,
            ),
        ),
        # Create WikiPageLabel through model
        migrations.CreateModel(
            name="WikiPageLabel",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Last Modified By",
                    ),
                ),
                (
                    "page",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="page_labels",
                        to="db.wikipage",
                    ),
                ),
                (
                    "label",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wiki_page_label_assignments",
                        to="db.label",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wiki_page_labels",
                        to="db.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Wiki Page Label",
                "verbose_name_plural": "Wiki Page Labels",
                "db_table": "wiki_page_labels",
                "unique_together": {("page", "label", "deleted_at")},
            },
        ),
        # Create WikiPageAssignee through model
        migrations.CreateModel(
            name="WikiPageAssignee",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Last Modified By",
                    ),
                ),
                (
                    "page",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="page_assignees",
                        to="db.wikipage",
                    ),
                ),
                (
                    "assignee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wiki_page_assignments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wiki_page_assignees",
                        to="db.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Wiki Page Assignee",
                "verbose_name_plural": "Wiki Page Assignees",
                "db_table": "wiki_page_assignees",
                "unique_together": {("page", "assignee", "deleted_at")},
            },
        ),
        # Add labels M2M to WikiPage
        migrations.AddField(
            model_name="wikipage",
            name="labels",
            field=models.ManyToManyField(
                blank=True,
                help_text="Labels for issue-type pages (tech debt: will become property)",
                related_name="wiki_pages",
                through="db.WikiPageLabel",
                to="db.label",
            ),
        ),
        # Add assignees M2M to WikiPage
        migrations.AddField(
            model_name="wikipage",
            name="assignees",
            field=models.ManyToManyField(
                blank=True,
                help_text="Assignees for issue-type pages (tech debt: will become property)",
                related_name="assigned_wiki_pages",
                through="db.WikiPageAssignee",
                through_fields=("page", "assignee"),
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Add constraints for WikiPageLabel
        migrations.AddConstraint(
            model_name="wikipagelabel",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("page", "label"),
                name="wiki_page_label_unique_when_not_deleted",
            ),
        ),
        # Add constraints for WikiPageAssignee
        migrations.AddConstraint(
            model_name="wikipageassignee",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("page", "assignee"),
                name="wiki_page_assignee_unique_when_not_deleted",
            ),
        ),
        # Add indexes for WikiPageLabel
        migrations.AddIndex(
            model_name="wikipagelabel",
            index=models.Index(fields=["page", "label"], name="wikipagelabel_page_label_idx"),
        ),
        # Add indexes for WikiPageAssignee
        migrations.AddIndex(
            model_name="wikipageassignee",
            index=models.Index(fields=["page", "assignee"], name="wikipageassign_page_user_idx"),
        ),
        migrations.AddIndex(
            model_name="wikipageassignee",
            index=models.Index(fields=["assignee"], name="wikipageassign_user_idx"),
        ),
        # Add indexes for WikiPage new fields
        migrations.AddIndex(
            model_name="wikipage",
            index=models.Index(fields=["workspace", "page_type"], name="wikipage_ws_type_idx"),
        ),
        migrations.AddIndex(
            model_name="wikipage",
            index=models.Index(fields=["project", "page_type"], name="wikipage_proj_type_idx"),
        ),
        migrations.AddIndex(
            model_name="wikipage",
            index=models.Index(fields=["project", "sequence_id"], name="wikipage_proj_seq_idx"),
        ),
        migrations.AddIndex(
            model_name="wikipage",
            index=models.Index(fields=["workspace", "state"], name="wikipage_ws_state_idx"),
        ),
    ]

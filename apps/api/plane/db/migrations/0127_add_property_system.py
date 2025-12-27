# Generated migration for property system

import django.contrib.postgres.fields
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("db", "0126_add_project_to_wiki_page"),
    ]

    operations = [
        migrations.CreateModel(
            name="PropertyDefinition",
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
                ("name", models.CharField(max_length=255)),
                ("slug", models.SlugField(db_index=True, max_length=255)),
                (
                    "property_type",
                    models.CharField(
                        choices=[
                            ("text", "Text"),
                            ("number", "Number"),
                            ("select", "Select"),
                            ("multi_select", "Multi Select"),
                            ("date", "Date"),
                            ("user", "User"),
                            ("multi_user", "Multi User"),
                            ("checkbox", "Checkbox"),
                            ("url", "URL"),
                            ("relation", "Relation"),
                        ],
                        max_length=50,
                    ),
                ),
                ("description", models.TextField(blank=True, default="")),
                ("options", models.JSONField(blank=True, default=list)),
                ("default_value", models.JSONField(blank=True, null=True)),
                (
                    "page_types",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=50),
                        blank=True,
                        default=list,
                        help_text="Page types that show this property. Empty means all types.",
                        size=None,
                    ),
                ),
                ("sort_order", models.FloatField(default=65535)),
                ("is_system", models.BooleanField(default=False)),
                ("is_hidden", models.BooleanField(default=False)),
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
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="property_definitions",
                        to="db.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Property Definition",
                "verbose_name_plural": "Property Definitions",
                "db_table": "property_definitions",
                "ordering": ("sort_order", "name"),
            },
        ),
        migrations.CreateModel(
            name="PagePropertyValue",
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
                ("value_text", models.TextField(blank=True, null=True)),
                ("value_number", models.DecimalField(blank=True, decimal_places=4, max_digits=20, null=True)),
                ("value_date", models.DateField(blank=True, null=True)),
                ("value_datetime", models.DateTimeField(blank=True, null=True)),
                ("value_boolean", models.BooleanField(null=True)),
                ("value_json", models.JSONField(blank=True, null=True)),
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
                        related_name="property_values",
                        to="db.wikipage",
                    ),
                ),
                (
                    "property",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="values",
                        to="db.propertydefinition",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="page_property_values",
                        to="db.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Page Property Value",
                "verbose_name_plural": "Page Property Values",
                "db_table": "page_property_values",
            },
        ),
        # Add constraints
        migrations.AddConstraint(
            model_name="propertydefinition",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("workspace", "slug"),
                name="property_def_unique_slug_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="pagepropertyvalue",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("page", "property"),
                name="page_prop_value_unique_when_not_deleted",
            ),
        ),
        # Add indexes
        migrations.AddIndex(
            model_name="propertydefinition",
            index=models.Index(fields=["workspace", "is_system"], name="propdef_ws_system_idx"),
        ),
        migrations.AddIndex(
            model_name="propertydefinition",
            index=models.Index(fields=["workspace", "property_type"], name="propdef_ws_type_idx"),
        ),
        migrations.AddIndex(
            model_name="pagepropertyvalue",
            index=models.Index(fields=["page", "property"], name="pageprop_page_prop_idx"),
        ),
        migrations.AddIndex(
            model_name="pagepropertyvalue",
            index=models.Index(fields=["workspace", "property"], name="pageprop_ws_prop_idx"),
        ),
        migrations.AddIndex(
            model_name="pagepropertyvalue",
            index=models.Index(fields=["value_date"], name="pageprop_date_idx"),
        ),
        migrations.AddIndex(
            model_name="pagepropertyvalue",
            index=models.Index(fields=["value_datetime"], name="pageprop_datetime_idx"),
        ),
    ]

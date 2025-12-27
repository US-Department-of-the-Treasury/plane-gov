"""
Property system models for the unified page model.

This implements a flexible property system inspired by Notion where pages can have
typed properties. PropertyDefinition defines the schema, PagePropertyValue stores
instance data.
"""

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

from .base import BaseModel


class PropertyDefinition(BaseModel):
    """
    Defines a property that can be applied to pages.

    Properties are workspace-scoped and can be restricted to specific page types.
    System properties (is_system=True) cannot be deleted by users.
    """

    PROPERTY_TYPES = (
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
    )

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="property_definitions"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, db_index=True)
    property_type = models.CharField(max_length=50, choices=PROPERTY_TYPES)
    description = models.TextField(blank=True, default="")

    # For select/multi_select types: [{ id, label, color, order }]
    options = models.JSONField(default=list, blank=True)

    # Default value (JSON for flexibility)
    default_value = models.JSONField(null=True, blank=True)

    # Which page types show this property (empty = all types)
    page_types = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="Page types that show this property. Empty means all types.",
    )

    # Ordering in property panel
    sort_order = models.FloatField(default=65535)

    # System property (can't be deleted by users)
    is_system = models.BooleanField(default=False)

    # Hidden from UI but still functional
    is_hidden = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Property Definition"
        verbose_name_plural = "Property Definitions"
        db_table = "property_definitions"
        ordering = ("sort_order", "name")
        unique_together = [["workspace", "slug", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="property_def_unique_slug_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["workspace", "is_system"], name="propdef_ws_system_idx"),
            models.Index(fields=["workspace", "property_type"], name="propdef_ws_type_idx"),
        ]

    def __str__(self):
        return f"{self.workspace.name} - {self.name} ({self.property_type})"


class PagePropertyValue(BaseModel):
    """
    Stores a property value for a specific page.

    Uses typed columns for different property types to enable efficient queries.
    Only one value column should be set based on the property_type.
    """

    page = models.ForeignKey(
        "db.WikiPage", on_delete=models.CASCADE, related_name="property_values"
    )
    property = models.ForeignKey(
        PropertyDefinition, on_delete=models.CASCADE, related_name="values"
    )
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_property_values"
    )

    # Typed value columns (only one should be set based on property_type)
    value_text = models.TextField(null=True, blank=True)
    value_number = models.DecimalField(
        max_digits=20, decimal_places=4, null=True, blank=True
    )
    value_date = models.DateField(null=True, blank=True)
    value_datetime = models.DateTimeField(null=True, blank=True)
    value_boolean = models.BooleanField(null=True)
    # For select IDs, user IDs arrays, relation IDs, etc.
    value_json = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = "Page Property Value"
        verbose_name_plural = "Page Property Values"
        db_table = "page_property_values"
        unique_together = [["page", "property", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["page", "property"],
                condition=models.Q(deleted_at__isnull=True),
                name="page_prop_value_unique_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["page", "property"], name="pageprop_page_prop_idx"),
            models.Index(fields=["workspace", "property"], name="pageprop_ws_prop_idx"),
            models.Index(fields=["value_date"], name="pageprop_date_idx"),
            models.Index(fields=["value_datetime"], name="pageprop_datetime_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} - {self.property.name}"

    def save(self, *args, **kwargs):
        # Auto-set workspace from page
        if self.page_id and not self.workspace_id:
            self.workspace_id = self.page.workspace_id
        super().save(*args, **kwargs)

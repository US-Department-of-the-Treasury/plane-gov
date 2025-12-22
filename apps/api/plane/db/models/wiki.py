import uuid

from django.conf import settings
from django.utils import timezone

# Django imports
from django.db import models

# Package imports
from plane.utils.html_processor import strip_tags

from .base import BaseModel


def get_default_logo_props():
    return {}


class WikiCollection(BaseModel):
    """
    Collections organize wiki pages into logical groups.
    Collections can be nested to create hierarchies.
    """

    DEFAULT_SORT_ORDER = 65535

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="wiki_collections"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=255, blank=True, default="")
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_collections",
    )
    sort_order = models.FloatField(default=DEFAULT_SORT_ORDER)

    class Meta:
        verbose_name = "Wiki Collection"
        verbose_name_plural = "Wiki Collections"
        db_table = "wiki_collections"
        ordering = ("sort_order", "name")
        indexes = [
            models.Index(fields=["workspace", "parent"], name="wikicoll_ws_parent_idx"),
        ]

    def __str__(self):
        return f"{self.workspace.name} - {self.name}"


class WikiPage(BaseModel):
    """
    Wiki pages contain collaborative documentation content.
    Pages can be nested and have different visibility levels.

    Visibility levels:
    - PRIVATE (1): Only owner can see (but admins can access with logging)
    - SHARED (2): Only explicitly shared users can see
    - PUBLIC (0): Disabled for government compliance - not shown in UI
    """

    PUBLIC_ACCESS = 0  # Disabled - not shown in UI
    PRIVATE_ACCESS = 1
    SHARED_ACCESS = 2

    ACCESS_CHOICES = (
        (PUBLIC_ACCESS, "Public"),  # Disabled
        (PRIVATE_ACCESS, "Private"),
        (SHARED_ACCESS, "Shared"),
    )

    DEFAULT_SORT_ORDER = 65535

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="wiki_pages"
    )
    collection = models.ForeignKey(
        WikiCollection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pages",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_pages",
    )
    name = models.TextField(blank=True)
    description = models.JSONField(default=dict, blank=True)
    description_binary = models.BinaryField(null=True)
    description_html = models.TextField(blank=True, default="<p></p>")
    description_stripped = models.TextField(blank=True, null=True)
    access = models.PositiveSmallIntegerField(choices=ACCESS_CHOICES, default=PRIVATE_ACCESS)
    owned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wiki_pages"
    )
    is_locked = models.BooleanField(default=False)
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="locked_wiki_pages",
    )
    sort_order = models.FloatField(default=DEFAULT_SORT_ORDER)
    logo_props = models.JSONField(default=get_default_logo_props)
    archived_at = models.DateField(null=True, blank=True)
    view_props = models.JSONField(default=dict)

    class Meta:
        verbose_name = "Wiki Page"
        verbose_name_plural = "Wiki Pages"
        db_table = "wiki_pages"
        ordering = ("sort_order", "-created_at")
        indexes = [
            models.Index(fields=["workspace", "collection"], name="wikipage_ws_coll_idx"),
            models.Index(fields=["workspace", "parent"], name="wikipage_ws_parent_idx"),
            models.Index(fields=["workspace", "access"], name="wikipage_ws_access_idx"),
            models.Index(fields=["workspace", "owned_by"], name="wikipage_ws_owner_idx"),
            models.Index(
                fields=["description_stripped"],
                name="wikipage_search_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ]

    def __str__(self):
        return f"{self.owned_by.email} - {self.name}"

    def save(self, *args, **kwargs):
        # Strip HTML tags for search indexing
        self.description_stripped = (
            None
            if (self.description_html == "" or self.description_html is None)
            else strip_tags(self.description_html)
        )
        super(WikiPage, self).save(*args, **kwargs)


class WikiPageShare(BaseModel):
    """
    Explicit sharing of wiki pages with specific users.
    Used when access=SHARED_ACCESS.
    """

    VIEW_PERMISSION = 0
    EDIT_PERMISSION = 1
    ADMIN_PERMISSION = 2

    PERMISSION_CHOICES = (
        (VIEW_PERMISSION, "View"),
        (EDIT_PERMISSION, "Edit"),
        (ADMIN_PERMISSION, "Admin"),
    )

    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="shares")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wiki_page_shares"
    )
    permission = models.PositiveSmallIntegerField(
        choices=PERMISSION_CHOICES, default=VIEW_PERMISSION
    )
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="wiki_page_shares"
    )

    class Meta:
        verbose_name = "Wiki Page Share"
        verbose_name_plural = "Wiki Page Shares"
        db_table = "wiki_page_shares"
        ordering = ("-created_at",)
        unique_together = ["page", "user", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["page", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="wiki_page_share_unique_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["page", "user"], name="wikishare_page_user_idx"),
            models.Index(fields=["user", "permission"], name="wikishare_user_perm_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} shared with {self.user.email}"


class WikiPageVersion(BaseModel):
    """
    Version history for wiki pages.
    Stores snapshots of content at specific points in time.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="wiki_page_versions"
    )
    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="versions")
    last_saved_at = models.DateTimeField(default=timezone.now)
    owned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wiki_page_versions"
    )
    description_binary = models.BinaryField(null=True)
    description_html = models.TextField(blank=True, default="<p></p>")
    description_stripped = models.TextField(blank=True, null=True)
    description_json = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Wiki Page Version"
        verbose_name_plural = "Wiki Page Versions"
        db_table = "wiki_page_versions"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page", "-created_at"], name="wikiversion_page_date_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} - v{self.created_at}"

    def save(self, *args, **kwargs):
        # Strip HTML tags for search
        self.description_stripped = (
            None
            if (self.description_html == "" or self.description_html is None)
            else strip_tags(self.description_html)
        )
        super(WikiPageVersion, self).save(*args, **kwargs)


class WikiPageAccessLog(BaseModel):
    """
    Audit log for wiki page access.
    Required for government compliance - tracks all access to private pages.
    """

    ACCESS_TYPE_VIEW = "view"
    ACCESS_TYPE_EDIT = "edit"
    ACCESS_TYPE_ADMIN_VIEW = "admin_view"
    ACCESS_TYPE_SHARE = "share"
    ACCESS_TYPE_UNSHARE = "unshare"
    ACCESS_TYPE_LOCK = "lock"
    ACCESS_TYPE_UNLOCK = "unlock"
    ACCESS_TYPE_ARCHIVE = "archive"
    ACCESS_TYPE_RESTORE = "restore"

    ACCESS_TYPE_CHOICES = (
        (ACCESS_TYPE_VIEW, "View"),
        (ACCESS_TYPE_EDIT, "Edit"),
        (ACCESS_TYPE_ADMIN_VIEW, "Admin View"),
        (ACCESS_TYPE_SHARE, "Share"),
        (ACCESS_TYPE_UNSHARE, "Unshare"),
        (ACCESS_TYPE_LOCK, "Lock"),
        (ACCESS_TYPE_UNLOCK, "Unlock"),
        (ACCESS_TYPE_ARCHIVE, "Archive"),
        (ACCESS_TYPE_RESTORE, "Restore"),
    )

    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="access_logs")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wiki_access_logs"
    )
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPE_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="wiki_access_logs"
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Wiki Page Access Log"
        verbose_name_plural = "Wiki Page Access Logs"
        db_table = "wiki_page_access_logs"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page", "-created_at"], name="wikilog_page_date_idx"),
            models.Index(fields=["user", "-created_at"], name="wikilog_user_date_idx"),
            models.Index(fields=["workspace", "access_type"], name="wikilog_ws_type_idx"),
        ]

    def __str__(self):
        return f"{self.user.email} {self.access_type} {self.page.name}"

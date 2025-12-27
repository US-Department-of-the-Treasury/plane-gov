import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models, transaction
from django.utils import timezone

# Package imports
from plane.utils.html_processor import strip_tags

from .base import BaseModel
from .description import Description
from plane.db.mixins import ChangeTrackerMixin


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

    This is the unified page model following Notion's paradigm where everything
    is a page with properties. A "work item" is a page with page_type="issue".

    Visibility levels:
    - PRIVATE (1): Only owner can see (but admins can access with logging)
    - SHARED (2): Only explicitly shared users can see
    - PUBLIC (0): Disabled for government compliance - not shown in UI

    Page types:
    - page: Standard wiki/documentation page
    - issue: Work item (formerly Issue model)
    - epic: Epic (future migration)
    - task: Task/sub-item
    """

    PUBLIC_ACCESS = 0  # Disabled - not shown in UI
    PRIVATE_ACCESS = 1
    SHARED_ACCESS = 2

    ACCESS_CHOICES = (
        (PUBLIC_ACCESS, "Public"),  # Disabled
        (PRIVATE_ACCESS, "Private"),
        (SHARED_ACCESS, "Shared"),
    )

    # Page type discriminator for unified model
    PAGE_TYPE_PAGE = "page"
    PAGE_TYPE_ISSUE = "issue"
    PAGE_TYPE_EPIC = "epic"
    PAGE_TYPE_TASK = "task"

    PAGE_TYPE_CHOICES = (
        (PAGE_TYPE_PAGE, "Page"),
        (PAGE_TYPE_ISSUE, "Issue"),
        (PAGE_TYPE_EPIC, "Epic"),
        (PAGE_TYPE_TASK, "Task"),
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
    project = models.ForeignKey(
        "db.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wiki_pages",
        help_text="Optional project association. When set, page appears in project's Pages tab.",
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

    # === Unified Page Model Fields ===

    # Page type discriminator
    page_type = models.CharField(
        max_length=50,
        choices=PAGE_TYPE_CHOICES,
        default=PAGE_TYPE_PAGE,
        db_index=True,
        help_text="Type of page: page (wiki), issue (work item), epic, task",
    )

    # For issue-type pages: project-scoped sequence ID (like PROJ-123)
    sequence_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Sequence ID for issue-type pages (project-scoped, like PROJ-123)",
    )

    # State for issue-type pages (FK for performance on hot path queries)
    state = models.ForeignKey(
        "db.State",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wiki_pages",
        help_text="State/status for issue-type pages",
    )

    # Completion timestamp
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this issue-type page was completed",
    )

    # TECH DEBT: Labels kept as M2M for now, eventually migrate to multi_select property
    labels = models.ManyToManyField(
        "db.Label",
        blank=True,
        through="WikiPageLabel",
        related_name="wiki_pages",
        help_text="Labels for issue-type pages (tech debt: will become property)",
    )

    # Assignees for issue-type pages
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        through="WikiPageAssignee",
        through_fields=("page", "assignee"),
        related_name="assigned_wiki_pages",
        help_text="Assignees for issue-type pages (tech debt: will become property)",
    )

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
            models.Index(fields=["workspace", "project"], name="wikipage_ws_proj_idx"),
            models.Index(
                fields=["description_stripped"],
                name="wikipage_search_idx",
                opclasses=["gin_trgm_ops"],
            ),
            # Indexes for unified page model
            models.Index(fields=["workspace", "page_type"], name="wikipage_ws_type_idx"),
            models.Index(fields=["project", "page_type"], name="wikipage_proj_type_idx"),
            models.Index(fields=["project", "sequence_id"], name="wikipage_proj_seq_idx"),
            models.Index(fields=["workspace", "state"], name="wikipage_ws_state_idx"),
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


class WikiPageLabel(BaseModel):
    """
    Through model for WikiPage labels.
    TECH DEBT: This will eventually be replaced by property values.
    """

    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="page_labels")
    label = models.ForeignKey("db.Label", on_delete=models.CASCADE, related_name="wiki_page_label_assignments")
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="wiki_page_labels"
    )

    class Meta:
        verbose_name = "Wiki Page Label"
        verbose_name_plural = "Wiki Page Labels"
        db_table = "wiki_page_labels"
        unique_together = [["page", "label", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["page", "label"],
                condition=models.Q(deleted_at__isnull=True),
                name="wiki_page_label_unique_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["page", "label"], name="wikipagelabel_page_label_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} - {self.label.name}"

    def save(self, *args, **kwargs):
        # Auto-set workspace from page
        if self.page_id and not self.workspace_id:
            self.workspace_id = self.page.workspace_id
        super().save(*args, **kwargs)


class WikiPageAssignee(BaseModel):
    """
    Through model for WikiPage assignees.
    TECH DEBT: This will eventually be replaced by property values.
    """

    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="page_assignees")
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wiki_page_assignments"
    )
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="wiki_page_assignees"
    )

    class Meta:
        verbose_name = "Wiki Page Assignee"
        verbose_name_plural = "Wiki Page Assignees"
        db_table = "wiki_page_assignees"
        unique_together = [["page", "assignee", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["page", "assignee"],
                condition=models.Q(deleted_at__isnull=True),
                name="wiki_page_assignee_unique_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["page", "assignee"], name="wikipageassign_page_user_idx"),
            models.Index(fields=["assignee"], name="wikipageassign_user_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} - {self.assignee.email}"

    def save(self, *args, **kwargs):
        # Auto-set workspace from page
        if self.page_id and not self.workspace_id:
            self.workspace_id = self.page.workspace_id
        super().save(*args, **kwargs)


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


class PageComment(ChangeTrackerMixin, BaseModel):
    """
    Comments on wiki pages. For issue-type pages, this replaces IssueComment.
    Uses ChangeTrackerMixin to track edits and manage associated Description model.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_comments"
    )
    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="comments")
    comment_stripped = models.TextField(verbose_name="Comment", blank=True)
    comment_json = models.JSONField(blank=True, default=dict)
    comment_html = models.TextField(blank=True, default="<p></p>")
    description = models.OneToOneField(
        Description, on_delete=models.CASCADE, related_name="page_comment_description", null=True
    )
    attachments = ArrayField(models.URLField(), size=10, blank=True, default=list)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="page_comments",
        null=True,
    )
    access = models.CharField(
        choices=(("INTERNAL", "INTERNAL"), ("EXTERNAL", "EXTERNAL")),
        default="INTERNAL",
        max_length=100,
    )
    external_source = models.CharField(max_length=255, null=True, blank=True)
    external_id = models.CharField(max_length=255, blank=True, null=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="child_comments"
    )

    TRACKED_FIELDS = ["comment_stripped", "comment_json", "comment_html"]

    def save(self, *args, **kwargs):
        """
        Custom save method for PageComment that manages the associated Description model.
        """
        self.comment_stripped = strip_tags(self.comment_html) if self.comment_html != "" else ""
        is_creating = self._state.adding

        # Prepare description defaults
        description_defaults = {
            "workspace_id": self.workspace_id,
            "created_by_id": self.created_by_id,
            "updated_by_id": self.updated_by_id,
            "description_stripped": self.comment_stripped,
            "description_json": self.comment_json,
            "description_html": self.comment_html,
        }

        with transaction.atomic():
            super(PageComment, self).save(*args, **kwargs)

            if is_creating or not self.description_id:
                # Create new description for new comment
                description = Description.objects.create(**description_defaults)
                self.description_id = description.id
                super(PageComment, self).save(update_fields=["description_id"])
            else:
                field_mapping = {
                    "comment_html": "description_html",
                    "comment_stripped": "description_stripped",
                    "comment_json": "description_json",
                }

                # Use _changes_on_save which is captured by ChangeTrackerMixin.save()
                changed_fields = {
                    desc_field: getattr(self, comment_field)
                    for comment_field, desc_field in field_mapping.items()
                    if comment_field in self._changes_on_save
                }

                # Update description only if comment fields changed
                if changed_fields and self.description_id:
                    Description.objects.filter(pk=self.description_id).update(
                        **changed_fields, updated_by_id=self.updated_by_id, updated_at=self.updated_at
                    )

    class Meta:
        verbose_name = "Page Comment"
        verbose_name_plural = "Page Comments"
        db_table = "page_comments"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page", "-created_at"], name="pagecomment_page_date_idx"),
            models.Index(fields=["actor"], name="pagecomment_actor_idx"),
            models.Index(fields=["workspace", "page"], name="pagecomment_ws_page_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} - comment by {self.actor.email if self.actor else 'system'}"


class PageCommentReaction(BaseModel):
    """
    Reactions to page comments (emoji reactions).
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_comment_reactions"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="page_comment_reactions",
    )
    comment = models.ForeignKey(PageComment, on_delete=models.CASCADE, related_name="reactions")
    reaction = models.TextField()

    class Meta:
        unique_together = ["comment", "actor", "reaction", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["comment", "actor", "reaction"],
                condition=models.Q(deleted_at__isnull=True),
                name="page_comment_reaction_unique_when_not_deleted",
            )
        ]
        verbose_name = "Page Comment Reaction"
        verbose_name_plural = "Page Comment Reactions"
        db_table = "page_comment_reactions"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["comment"], name="pagecomreact_comment_idx"),
        ]

    def __str__(self):
        return f"{self.comment.page.name} - {self.reaction} by {self.actor.email}"


class PageActivity(BaseModel):
    """
    Activity log for wiki pages. For issue-type pages, this replaces IssueActivity.
    Tracks all changes to a page including field changes and comments.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_activities"
    )
    page = models.ForeignKey(WikiPage, on_delete=models.DO_NOTHING, null=True, related_name="activities")
    verb = models.CharField(max_length=255, verbose_name="Action", default="created")
    field = models.CharField(max_length=255, verbose_name="Field Name", blank=True, null=True)
    old_value = models.TextField(verbose_name="Old Value", blank=True, null=True)
    new_value = models.TextField(verbose_name="New Value", blank=True, null=True)
    comment = models.TextField(verbose_name="Comment", blank=True)
    attachments = ArrayField(models.URLField(), size=10, blank=True, default=list)
    page_comment = models.ForeignKey(
        PageComment,
        on_delete=models.DO_NOTHING,
        related_name="page_activity",
        null=True,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="page_activities",
    )
    old_identifier = models.UUIDField(null=True)
    new_identifier = models.UUIDField(null=True)
    epoch = models.FloatField(null=True)

    class Meta:
        verbose_name = "Page Activity"
        verbose_name_plural = "Page Activities"
        db_table = "page_activities"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page", "-created_at"], name="pageactivity_page_date_idx"),
            models.Index(fields=["actor"], name="pageactivity_actor_idx"),
            models.Index(fields=["workspace", "verb"], name="pageactivity_ws_verb_idx"),
        ]

    def __str__(self):
        return f"{self.page.name if self.page else 'unknown'} - {self.verb}"


class PageSubscriber(BaseModel):
    """
    Subscribers to wiki pages. For issue-type pages, this replaces IssueSubscriber.
    Subscribers receive notifications for changes to the page.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_subscribers"
    )
    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="subscribers")
    subscriber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="page_subscriptions",
    )

    class Meta:
        unique_together = ["page", "subscriber", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["page", "subscriber"],
                condition=models.Q(deleted_at__isnull=True),
                name="page_subscriber_unique_when_not_deleted",
            )
        ]
        verbose_name = "Page Subscriber"
        verbose_name_plural = "Page Subscribers"
        db_table = "page_subscribers"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page"], name="pagesubscriber_page_idx"),
            models.Index(fields=["subscriber"], name="pagesubscriber_user_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} - {self.subscriber.email}"


class PageMention(BaseModel):
    """
    Track user mentions in page content.
    For issue-type pages, this replaces IssueMention.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_mentions"
    )
    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="mentions")
    mentioned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="page_mentions_received",
    )

    class Meta:
        unique_together = ["page", "mentioned_user", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["page", "mentioned_user"],
                condition=models.Q(deleted_at__isnull=True),
                name="page_mention_unique_when_not_deleted",
            )
        ]
        verbose_name = "Page Mention"
        verbose_name_plural = "Page Mentions"
        db_table = "page_mentions"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page"], name="pagemention_page_idx"),
            models.Index(fields=["mentioned_user"], name="pagemention_user_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} mentions {self.mentioned_user.email}"


class PageRelationChoices(models.TextChoices):
    """
    Relation types for page-to-page relationships.
    For issue-type pages, this replaces IssueRelationChoices.
    """

    DUPLICATE = "duplicate", "Duplicate"
    RELATES_TO = "relates_to", "Relates To"
    BLOCKED_BY = "blocked_by", "Blocked By"
    START_BEFORE = "start_before", "Start Before"
    FINISH_BEFORE = "finish_before", "Finish Before"
    IMPLEMENTED_BY = "implemented_by", "Implemented By"


# Bidirectional relation pairs: (forward, reverse)
PageRelationChoices._RELATION_PAIRS = (
    ("blocked_by", "blocking"),
    ("relates_to", "relates_to"),  # symmetric
    ("duplicate", "duplicate"),  # symmetric
    ("start_before", "start_after"),
    ("finish_before", "finish_after"),
    ("implemented_by", "implements"),
)

# Generate reverse mapping from pairs
PageRelationChoices._REVERSE_MAPPING = {
    forward: reverse for forward, reverse in PageRelationChoices._RELATION_PAIRS
}


class PageRelation(BaseModel):
    """
    Page-to-page relationships.
    For issue-type pages, this replaces IssueRelation.
    Supports blocking, duplicate, relates_to, and temporal relations.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_relations"
    )
    page = models.ForeignKey(WikiPage, related_name="page_relations", on_delete=models.CASCADE)
    related_page = models.ForeignKey(WikiPage, related_name="related_page_relations", on_delete=models.CASCADE)
    relation_type = models.CharField(
        max_length=20,
        verbose_name="Page Relation Type",
        choices=PageRelationChoices.choices,
        default=PageRelationChoices.BLOCKED_BY,
    )

    class Meta:
        unique_together = ["page", "related_page", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["page", "related_page"],
                condition=models.Q(deleted_at__isnull=True),
                name="page_relation_unique_when_not_deleted",
            )
        ]
        verbose_name = "Page Relation"
        verbose_name_plural = "Page Relations"
        db_table = "page_relations"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page"], name="pagerelation_page_idx"),
            models.Index(fields=["related_page"], name="pagerelation_related_idx"),
            models.Index(fields=["relation_type"], name="pagerelation_type_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} {self.relation_type} {self.related_page.name}"


class PageLink(BaseModel):
    """
    External links attached to pages.
    For issue-type pages, this replaces IssueLink.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="page_links"
    )
    page = models.ForeignKey(WikiPage, on_delete=models.CASCADE, related_name="links")
    title = models.CharField(max_length=255, blank=True, null=True)
    url = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Page Link"
        verbose_name_plural = "Page Links"
        db_table = "page_links"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["page"], name="pagelink_page_idx"),
        ]

    def __str__(self):
        return f"{self.page.name} - {self.title or self.url[:50]}"

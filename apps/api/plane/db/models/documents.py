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


class DocumentCollection(BaseModel):
    """
    Collections organize documents into logical groups.
    Collections can be nested to create hierarchies.
    """

    DEFAULT_SORT_ORDER = 65535

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_collections"
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
        verbose_name = "Document Collection"
        verbose_name_plural = "Document Collections"
        db_table = "document_collections"
        ordering = ("sort_order", "name")
        indexes = [
            models.Index(fields=["workspace", "parent"], name="doccoll_ws_parent_idx"),
        ]

    def __str__(self):
        return f"{self.workspace.name} - {self.name}"


class Document(BaseModel):
    """
    Documents contain collaborative documentation content.
    Documents can be nested and have different visibility levels.

    This is the unified document model following Notion's paradigm where everything
    is a document with properties. A "work item" is a document with document_type="issue".

    Visibility levels:
    - PRIVATE (1): Only owner can see (but admins can access with logging)
    - SHARED (2): Only explicitly shared users can see
    - PUBLIC (0): Disabled for government compliance - not shown in UI

    Document types:
    - page: Standard documentation page
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

    # Document type discriminator for unified model
    DOCUMENT_TYPE_PAGE = "page"
    DOCUMENT_TYPE_ISSUE = "issue"
    DOCUMENT_TYPE_EPIC = "epic"
    DOCUMENT_TYPE_TASK = "task"

    DOCUMENT_TYPE_CHOICES = (
        (DOCUMENT_TYPE_PAGE, "Page"),
        (DOCUMENT_TYPE_ISSUE, "Issue"),
        (DOCUMENT_TYPE_EPIC, "Epic"),
        (DOCUMENT_TYPE_TASK, "Task"),
    )

    DEFAULT_SORT_ORDER = 65535

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="documents"
    )
    collection = models.ForeignKey(
        DocumentCollection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    project = models.ForeignKey(
        "db.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
        help_text="Optional project association. When set, document appears in project's Pages tab.",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_documents",
    )
    name = models.TextField(blank=True)
    description = models.JSONField(default=dict, blank=True)
    description_binary = models.BinaryField(null=True)
    description_html = models.TextField(blank=True, default="<p></p>")
    description_stripped = models.TextField(blank=True, null=True)
    access = models.PositiveSmallIntegerField(choices=ACCESS_CHOICES, default=PRIVATE_ACCESS)
    owned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="documents"
    )
    is_locked = models.BooleanField(default=False)
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="locked_documents",
    )
    sort_order = models.FloatField(default=DEFAULT_SORT_ORDER)
    logo_props = models.JSONField(default=get_default_logo_props)
    archived_at = models.DateField(null=True, blank=True)
    view_props = models.JSONField(default=dict)

    # === Unified Document Model Fields ===

    # Document type discriminator
    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES,
        default=DOCUMENT_TYPE_PAGE,
        db_index=True,
        help_text="Type of document: page (documentation), issue (work item), epic, task",
    )

    # For issue-type documents: project-scoped sequence ID (like PROJ-123)
    sequence_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Sequence ID for issue-type documents (project-scoped, like PROJ-123)",
    )

    # State for issue-type documents (FK for performance on hot path queries)
    state = models.ForeignKey(
        "db.State",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
        help_text="State/status for issue-type documents",
    )

    # Completion timestamp
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this issue-type document was completed",
    )

    # TECH DEBT: Labels kept as M2M for now, eventually migrate to multi_select property
    labels = models.ManyToManyField(
        "db.Label",
        blank=True,
        through="DocumentLabel",
        related_name="documents",
        help_text="Labels for issue-type documents (tech debt: will become property)",
    )

    # Assignees for issue-type documents
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        through="DocumentAssignee",
        through_fields=("document", "assignee"),
        related_name="assigned_documents",
        help_text="Assignees for issue-type documents (tech debt: will become property)",
    )

    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        db_table = "documents"
        ordering = ("sort_order", "-created_at")
        indexes = [
            models.Index(fields=["workspace", "collection"], name="doc_ws_coll_idx"),
            models.Index(fields=["workspace", "parent"], name="doc_ws_parent_idx"),
            models.Index(fields=["workspace", "access"], name="doc_ws_access_idx"),
            models.Index(fields=["workspace", "owned_by"], name="doc_ws_owner_idx"),
            models.Index(fields=["workspace", "project"], name="doc_ws_proj_idx"),
            models.Index(
                fields=["description_stripped"],
                name="doc_search_idx",
                opclasses=["gin_trgm_ops"],
            ),
            # Indexes for unified document model
            models.Index(fields=["workspace", "document_type"], name="doc_ws_doctype_idx"),
            models.Index(fields=["project", "document_type"], name="doc_proj_doctype_idx"),
            models.Index(fields=["project", "sequence_id"], name="doc_proj_seq_idx"),
            models.Index(fields=["workspace", "state"], name="doc_ws_state_idx"),
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
        super(Document, self).save(*args, **kwargs)


class DocumentLabel(BaseModel):
    """
    Through model for Document labels.
    TECH DEBT: This will eventually be replaced by property values.
    """

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="document_labels")
    label = models.ForeignKey("db.Label", on_delete=models.CASCADE, related_name="document_label_assignments")
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_labels"
    )

    class Meta:
        verbose_name = "Document Label"
        verbose_name_plural = "Document Labels"
        db_table = "document_labels"
        unique_together = [["document", "label", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "label"],
                condition=models.Q(deleted_at__isnull=True),
                name="document_label_unique_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["document", "label"], name="doclabel_doc_label_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} - {self.label.name}"

    def save(self, *args, **kwargs):
        # Auto-set workspace from document
        if self.document_id and not self.workspace_id:
            self.workspace_id = self.document.workspace_id
        super().save(*args, **kwargs)


class DocumentAssignee(BaseModel):
    """
    Through model for Document assignees.
    TECH DEBT: This will eventually be replaced by property values.
    """

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="document_assignees")
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="document_assignments"
    )
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_assignees"
    )

    class Meta:
        verbose_name = "Document Assignee"
        verbose_name_plural = "Document Assignees"
        db_table = "document_assignees"
        unique_together = [["document", "assignee", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "assignee"],
                condition=models.Q(deleted_at__isnull=True),
                name="document_assignee_unique_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["document", "assignee"], name="docassign_doc_user_idx"),
            models.Index(fields=["assignee"], name="docassign_user_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} - {self.assignee.email}"

    def save(self, *args, **kwargs):
        # Auto-set workspace from document
        if self.document_id and not self.workspace_id:
            self.workspace_id = self.document.workspace_id
        super().save(*args, **kwargs)


class DocumentShare(BaseModel):
    """
    Explicit sharing of documents with specific users.
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

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="shares")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="document_shares"
    )
    permission = models.PositiveSmallIntegerField(
        choices=PERMISSION_CHOICES, default=VIEW_PERMISSION
    )
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_shares"
    )

    class Meta:
        verbose_name = "Document Share"
        verbose_name_plural = "Document Shares"
        db_table = "document_shares"
        ordering = ("-created_at",)
        unique_together = ["document", "user", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="document_share_unique_when_not_deleted",
            )
        ]
        indexes = [
            models.Index(fields=["document", "user"], name="docshare_doc_user_idx"),
            models.Index(fields=["user", "permission"], name="docshare_user_perm_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} shared with {self.user.email}"


class DocumentVersion(BaseModel):
    """
    Version history for documents.
    Stores snapshots of content at specific points in time.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_versions"
    )
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    last_saved_at = models.DateTimeField(default=timezone.now)
    owned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="document_versions"
    )
    description_binary = models.BinaryField(null=True)
    description_html = models.TextField(blank=True, default="<p></p>")
    description_stripped = models.TextField(blank=True, null=True)
    description_json = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Document Version"
        verbose_name_plural = "Document Versions"
        db_table = "document_versions"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document", "-created_at"], name="docversion_doc_date_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} - v{self.created_at}"

    def save(self, *args, **kwargs):
        # Strip HTML tags for search
        self.description_stripped = (
            None
            if (self.description_html == "" or self.description_html is None)
            else strip_tags(self.description_html)
        )
        super(DocumentVersion, self).save(*args, **kwargs)


class DocumentAccessLog(BaseModel):
    """
    Audit log for document access.
    Required for government compliance - tracks all access to private documents.
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

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="access_logs")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="document_access_logs"
    )
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPE_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_access_logs"
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Document Access Log"
        verbose_name_plural = "Document Access Logs"
        db_table = "document_access_logs"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document", "-created_at"], name="doclog_doc_date_idx"),
            models.Index(fields=["user", "-created_at"], name="doclog_user_date_idx"),
            models.Index(fields=["workspace", "access_type"], name="doclog_ws_type_idx"),
        ]

    def __str__(self):
        return f"{self.user.email} {self.access_type} {self.document.name}"


class DocumentComment(ChangeTrackerMixin, BaseModel):
    """
    Comments on documents. For issue-type documents, this replaces IssueComment.
    Uses ChangeTrackerMixin to track edits and manage associated Description model.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_comments"
    )
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="comments")
    comment_stripped = models.TextField(verbose_name="Comment", blank=True)
    comment_json = models.JSONField(blank=True, default=dict)
    comment_html = models.TextField(blank=True, default="<p></p>")
    description = models.OneToOneField(
        Description, on_delete=models.CASCADE, related_name="document_comment_description", null=True
    )
    attachments = ArrayField(models.URLField(), size=10, blank=True, default=list)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_comments",
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
        Custom save method for DocumentComment that manages the associated Description model.
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
            super(DocumentComment, self).save(*args, **kwargs)

            if is_creating or not self.description_id:
                # Create new description for new comment
                description = Description.objects.create(**description_defaults)
                self.description_id = description.id
                super(DocumentComment, self).save(update_fields=["description_id"])
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
        verbose_name = "Document Comment"
        verbose_name_plural = "Document Comments"
        db_table = "document_comments"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document", "-created_at"], name="doccomment_doc_date_idx"),
            models.Index(fields=["actor"], name="doccomment_actor_idx"),
            models.Index(fields=["workspace", "document"], name="doccomment_ws_doc_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} - comment by {self.actor.email if self.actor else 'system'}"


class DocumentCommentReaction(BaseModel):
    """
    Reactions to document comments (emoji reactions).
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_comment_reactions"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_comment_reactions",
    )
    comment = models.ForeignKey(DocumentComment, on_delete=models.CASCADE, related_name="reactions")
    reaction = models.TextField()

    class Meta:
        unique_together = ["comment", "actor", "reaction", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["comment", "actor", "reaction"],
                condition=models.Q(deleted_at__isnull=True),
                name="document_comment_reaction_unique_when_not_deleted",
            )
        ]
        verbose_name = "Document Comment Reaction"
        verbose_name_plural = "Document Comment Reactions"
        db_table = "document_comment_reactions"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["comment"], name="doccomreact_comment_idx"),
        ]

    def __str__(self):
        return f"{self.comment.document.name} - {self.reaction} by {self.actor.email}"


class DocumentActivity(BaseModel):
    """
    Activity log for documents. For issue-type documents, this replaces IssueActivity.
    Tracks all changes to a document including field changes and comments.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_activities"
    )
    document = models.ForeignKey(Document, on_delete=models.DO_NOTHING, null=True, related_name="activities")
    verb = models.CharField(max_length=255, verbose_name="Action", default="created")
    field = models.CharField(max_length=255, verbose_name="Field Name", blank=True, null=True)
    old_value = models.TextField(verbose_name="Old Value", blank=True, null=True)
    new_value = models.TextField(verbose_name="New Value", blank=True, null=True)
    comment = models.TextField(verbose_name="Comment", blank=True)
    attachments = ArrayField(models.URLField(), size=10, blank=True, default=list)
    document_comment = models.ForeignKey(
        DocumentComment,
        on_delete=models.DO_NOTHING,
        related_name="document_activity",
        null=True,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_activities",
    )
    old_identifier = models.UUIDField(null=True)
    new_identifier = models.UUIDField(null=True)
    epoch = models.FloatField(null=True)

    class Meta:
        verbose_name = "Document Activity"
        verbose_name_plural = "Document Activities"
        db_table = "document_activities"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document", "-created_at"], name="docactivity_doc_date_idx"),
            models.Index(fields=["actor"], name="docactivity_actor_idx"),
            models.Index(fields=["workspace", "verb"], name="docactivity_ws_verb_idx"),
        ]

    def __str__(self):
        return f"{self.document.name if self.document else 'unknown'} - {self.verb}"


class DocumentSubscriber(BaseModel):
    """
    Subscribers to documents. For issue-type documents, this replaces IssueSubscriber.
    Subscribers receive notifications for changes to the document.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_subscribers"
    )
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="subscribers")
    subscriber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_subscriptions",
    )

    class Meta:
        unique_together = ["document", "subscriber", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "subscriber"],
                condition=models.Q(deleted_at__isnull=True),
                name="document_subscriber_unique_when_not_deleted",
            )
        ]
        verbose_name = "Document Subscriber"
        verbose_name_plural = "Document Subscribers"
        db_table = "document_subscribers"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document"], name="docsubscriber_doc_idx"),
            models.Index(fields=["subscriber"], name="docsubscriber_user_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} - {self.subscriber.email}"


class DocumentMention(BaseModel):
    """
    Track user mentions in document content.
    For issue-type documents, this replaces IssueMention.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_mentions"
    )
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="mentions")
    mentioned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_mentions_received",
    )

    class Meta:
        unique_together = ["document", "mentioned_user", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "mentioned_user"],
                condition=models.Q(deleted_at__isnull=True),
                name="document_mention_unique_when_not_deleted",
            )
        ]
        verbose_name = "Document Mention"
        verbose_name_plural = "Document Mentions"
        db_table = "document_mentions"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document"], name="docmention_doc_idx"),
            models.Index(fields=["mentioned_user"], name="docmention_user_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} mentions {self.mentioned_user.email}"


class DocumentRelationChoices(models.TextChoices):
    """
    Relation types for document-to-document relationships.
    For issue-type documents, this replaces IssueRelationChoices.
    """

    DUPLICATE = "duplicate", "Duplicate"
    RELATES_TO = "relates_to", "Relates To"
    BLOCKED_BY = "blocked_by", "Blocked By"
    START_BEFORE = "start_before", "Start Before"
    FINISH_BEFORE = "finish_before", "Finish Before"
    IMPLEMENTED_BY = "implemented_by", "Implemented By"


# Bidirectional relation pairs: (forward, reverse)
DocumentRelationChoices._RELATION_PAIRS = (
    ("blocked_by", "blocking"),
    ("relates_to", "relates_to"),  # symmetric
    ("duplicate", "duplicate"),  # symmetric
    ("start_before", "start_after"),
    ("finish_before", "finish_after"),
    ("implemented_by", "implements"),
)

# Generate reverse mapping from pairs
DocumentRelationChoices._REVERSE_MAPPING = {
    forward: reverse for forward, reverse in DocumentRelationChoices._RELATION_PAIRS
}


class DocumentRelation(BaseModel):
    """
    Document-to-document relationships.
    For issue-type documents, this replaces IssueRelation.
    Supports blocking, duplicate, relates_to, and temporal relations.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_relations"
    )
    document = models.ForeignKey(Document, related_name="document_relations", on_delete=models.CASCADE)
    related_document = models.ForeignKey(Document, related_name="related_document_relations", on_delete=models.CASCADE)
    relation_type = models.CharField(
        max_length=20,
        verbose_name="Document Relation Type",
        choices=DocumentRelationChoices.choices,
        default=DocumentRelationChoices.BLOCKED_BY,
    )

    class Meta:
        unique_together = ["document", "related_document", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "related_document"],
                condition=models.Q(deleted_at__isnull=True),
                name="document_relation_unique_when_not_deleted",
            )
        ]
        verbose_name = "Document Relation"
        verbose_name_plural = "Document Relations"
        db_table = "document_relations"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document"], name="docrelation_doc_idx"),
            models.Index(fields=["related_document"], name="docrelation_related_idx"),
            models.Index(fields=["relation_type"], name="docrelation_type_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} {self.relation_type} {self.related_document.name}"


class DocumentLink(BaseModel):
    """
    External links attached to documents.
    For issue-type documents, this replaces IssueLink.
    """

    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="document_links"
    )
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="links")
    title = models.CharField(max_length=255, blank=True, null=True)
    url = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Document Link"
        verbose_name_plural = "Document Links"
        db_table = "document_links"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["document"], name="doclink_doc_idx"),
        ]

    def __str__(self):
        return f"{self.document.name} - {self.title or self.url[:50]}"


class IssueToDocumentMapping(models.Model):
    """
    Mapping table to track Issue -> Document correspondence during migration.
    This table allows looking up which Document was created from which Issue,
    enabling reversibility and foreign key updates.
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
    )
    issue_id = models.UUIDField(db_index=True)
    document_id = models.UUIDField(db_index=True)
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="issue_document_mappings"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "issue_to_document_mappings"
        verbose_name = "Issue to Document Mapping"
        verbose_name_plural = "Issue to Document Mappings"
        indexes = [
            models.Index(fields=["issue_id", "document_id"], name="issue_doc_mapping_idx"),
        ]

    def __str__(self):
        return f"Issue {self.issue_id} -> Document {self.document_id}"

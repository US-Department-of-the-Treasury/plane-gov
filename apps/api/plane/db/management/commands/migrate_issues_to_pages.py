"""
Management command to migrate Issues to WikiPages.

This command migrates existing Issue records to WikiPage records with page_type="issue".
It also migrates all related data: comments, activities, relations, subscribers, links,
mentions, labels, and assignees.

The migration is idempotent - running it multiple times will skip already-migrated issues.

Usage:
    python manage.py migrate_issues_to_pages
    python manage.py migrate_issues_to_pages --workspace=<slug>
    python manage.py migrate_issues_to_pages --dry-run
"""

from django.core.management import BaseCommand
from django.db import transaction
from django.utils import timezone

from plane.db.models import (
    # Source models (Issue)
    Issue,
    IssueComment,
    IssueActivity,
    IssueSubscriber,
    IssueLink,
    IssueMention,
    IssueLabel,
    IssueRelation,
    IssueAssignee,
    # Target models (WikiPage)
    WikiPage,
    WikiPageLabel,
    WikiPageAssignee,
    PageComment,
    PageActivity,
    PageSubscriber,
    PageLink,
    PageMention,
    PageRelation,
    PageRelationChoices,
    IssueToPageMapping,
    # Supporting models
    Workspace,
    PropertyDefinition,
    PagePropertyValue,
)


# Map IssueRelation types to PageRelation types
RELATION_TYPE_MAP = {
    "duplicate": PageRelationChoices.DUPLICATE,
    "relates_to": PageRelationChoices.RELATES_TO,
    "blocked_by": PageRelationChoices.BLOCKED_BY,
    "blocking": PageRelationChoices.BLOCKED_BY,  # Will be reversed
}


class Command(BaseCommand):
    help = "Migrate Issues to WikiPages"

    def add_arguments(self, parser):
        parser.add_argument(
            "--workspace",
            type=str,
            help="Workspace slug to migrate. If not provided, migrates all workspaces.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be migrated without making changes.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of issues to process per batch (default: 100).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        workspace_slug = options.get("workspace")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes will be made"))

        # Get workspaces to process
        if workspace_slug:
            workspaces = Workspace.objects.filter(slug=workspace_slug)
            if not workspaces.exists():
                self.stdout.write(self.style.ERROR(f"Workspace '{workspace_slug}' not found"))
                return
        else:
            workspaces = Workspace.objects.all()

        total_migrated = 0
        total_skipped = 0

        for workspace in workspaces:
            migrated, skipped = self.migrate_workspace(workspace, dry_run, batch_size)
            total_migrated += migrated
            total_skipped += skipped

        self.stdout.write(
            self.style.SUCCESS(
                f"\nMigration complete: {total_migrated} issues migrated, {total_skipped} skipped"
            )
        )

    def migrate_workspace(self, workspace, dry_run, batch_size):
        """Migrate all issues in a workspace."""
        self.stdout.write(f"\nProcessing workspace: {workspace.name} ({workspace.slug})")

        # Get already-migrated issue IDs
        migrated_issue_ids = set(
            IssueToPageMapping.objects.filter(workspace=workspace)
            .values_list("issue_id", flat=True)
        )

        # Get issues to migrate (excluding already migrated)
        issues = Issue.objects.filter(
            workspace=workspace,
        ).exclude(id__in=migrated_issue_ids).select_related(
            "project", "state", "parent", "created_by", "updated_by"
        ).prefetch_related(
            "labels", "assignees"
        )

        total_issues = issues.count()
        self.stdout.write(f"  Found {total_issues} issues to migrate ({len(migrated_issue_ids)} already migrated)")

        if dry_run:
            return total_issues, len(migrated_issue_ids)

        migrated = 0
        skipped = 0
        # Process in batches
        for i in range(0, total_issues, batch_size):
            batch = issues[i:i + batch_size]
            with transaction.atomic():
                for issue in batch:
                    page = self.migrate_issue(issue, workspace)
                    if page:
                        migrated += 1
                    else:
                        skipped += 1

            self.stdout.write(f"  Migrated {migrated}/{total_issues} issues (skipped {skipped})")

        return migrated, len(migrated_issue_ids) + skipped

    def migrate_issue(self, issue, workspace):
        """Migrate a single issue to a WikiPage."""
        # Get owner - use created_by, or fall back to workspace owner
        owner = issue.created_by
        if not owner:
            # Get workspace owner (first admin member)
            from plane.db.models import WorkspaceMember
            owner_member = WorkspaceMember.objects.filter(
                workspace=workspace,
                role=20,  # Admin
                is_active=True,
            ).select_related("member").first()
            if owner_member:
                owner = owner_member.member
            else:
                # Last resort: any workspace member
                any_member = WorkspaceMember.objects.filter(
                    workspace=workspace,
                    is_active=True,
                ).select_related("member").first()
                owner = any_member.member if any_member else None

        if not owner:
            self.stdout.write(
                self.style.WARNING(f"  Skipping issue {issue.id} - no owner available")
            )
            return None

        # Create WikiPage from Issue
        page = WikiPage.objects.create(
            id=issue.id,  # Preserve the UUID for easier FK updates
            workspace=workspace,
            name=issue.name,
            description_html=issue.description_html or "",
            description_stripped=issue.description_stripped or "",
            page_type=WikiPage.PAGE_TYPE_ISSUE,
            access=WikiPage.PRIVATE_ACCESS,
            owned_by=owner,
            parent=None,  # Will be updated if parent issue exists
            collection=None,  # Issues don't have collections
            sort_order=issue.sort_order,
            # Issue-specific fields
            sequence_id=issue.sequence_id,
            state=issue.state,
            completed_at=issue.completed_at,
            # Preserve timestamps
            created_at=issue.created_at,
            updated_at=issue.updated_at,
            created_by=issue.created_by,
            updated_by=issue.updated_by,
        )

        # Record the mapping
        IssueToPageMapping.objects.create(
            issue_id=issue.id,
            page_id=page.id,
            workspace=workspace,
        )

        # Migrate labels (M2M through WikiPageLabel)
        for issue_label in IssueLabel.objects.filter(issue=issue, deleted_at__isnull=True):
            WikiPageLabel.objects.create(
                page=page,
                label=issue_label.label,
                workspace=workspace,
                created_by=issue_label.created_by,
                updated_by=issue_label.updated_by,
            )

        # Migrate assignees (M2M through WikiPageAssignee)
        for issue_assignee in IssueAssignee.objects.filter(issue=issue, deleted_at__isnull=True):
            WikiPageAssignee.objects.create(
                page=page,
                assignee=issue_assignee.assignee,
                workspace=workspace,
                created_by=issue_assignee.created_by,
                updated_by=issue_assignee.updated_by,
            )

        # Migrate comments
        for comment in IssueComment.objects.filter(issue=issue, deleted_at__isnull=True):
            PageComment.objects.create(
                workspace=workspace,
                page=page,
                comment_html=comment.comment_html,
                comment_stripped=comment.comment_stripped,
                actor=comment.actor,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
                created_by=comment.created_by,
                updated_by=comment.updated_by,
            )

        # Migrate activities
        for activity in IssueActivity.objects.filter(issue=issue):
            PageActivity.objects.create(
                workspace=workspace,
                page=page,
                verb=activity.verb,
                field=activity.field,
                old_value=activity.old_value,
                new_value=activity.new_value,
                comment=activity.comment or "",
                actor=activity.actor,
                created_at=activity.created_at,
                updated_at=activity.updated_at,
                created_by=activity.created_by,
                updated_by=activity.updated_by,
            )

        # Migrate subscribers
        for subscriber in IssueSubscriber.objects.filter(issue=issue):
            PageSubscriber.objects.create(
                workspace=workspace,
                page=page,
                subscriber=subscriber.subscriber,
                created_at=subscriber.created_at,
                updated_at=subscriber.updated_at,
                created_by=subscriber.created_by,
                updated_by=subscriber.updated_by,
            )

        # Migrate links
        for link in IssueLink.objects.filter(issue=issue, deleted_at__isnull=True):
            PageLink.objects.create(
                workspace=workspace,
                page=page,
                title=link.title,
                url=link.url,
                metadata=link.metadata or {},
                created_at=link.created_at,
                updated_at=link.updated_at,
                created_by=link.created_by,
                updated_by=link.updated_by,
            )

        # Migrate mentions
        for mention in IssueMention.objects.filter(issue=issue):
            PageMention.objects.create(
                workspace=workspace,
                page=page,
                mentioned_user=mention.mention,
                created_at=mention.created_at,
                updated_at=mention.updated_at,
                created_by=mention.created_by,
                updated_by=mention.updated_by,
            )

        # Migrate issue properties as PagePropertyValues
        self.migrate_issue_properties(issue, page, workspace)

        return page

    def migrate_issue_properties(self, issue, page, workspace):
        """Migrate issue fields to property values."""
        # Get property definitions for this workspace
        properties = {
            prop.slug: prop
            for prop in PropertyDefinition.objects.filter(
                workspace=workspace,
                is_system=True,
                deleted_at__isnull=True,
            )
        }

        # Priority
        if "priority" in properties and issue.priority:
            PagePropertyValue.objects.create(
                workspace=workspace,
                page=page,
                property=properties["priority"],
                value_json={"id": issue.priority},
                created_by=issue.created_by,
                updated_by=issue.updated_by,
            )

        # Start Date
        if "start_date" in properties and issue.start_date:
            PagePropertyValue.objects.create(
                workspace=workspace,
                page=page,
                property=properties["start_date"],
                value_date=issue.start_date,
                created_by=issue.created_by,
                updated_by=issue.updated_by,
            )

        # Target Date
        if "target_date" in properties and issue.target_date:
            PagePropertyValue.objects.create(
                workspace=workspace,
                page=page,
                property=properties["target_date"],
                value_date=issue.target_date,
                created_by=issue.created_by,
                updated_by=issue.updated_by,
            )

        # Estimate Points
        if "estimate" in properties and issue.estimate_point is not None:
            PagePropertyValue.objects.create(
                workspace=workspace,
                page=page,
                property=properties["estimate"],
                value_number=issue.estimate_point,
                created_by=issue.created_by,
                updated_by=issue.updated_by,
            )


class MigrateRelationsCommand(BaseCommand):
    """
    Separate command to migrate relations after all issues are migrated.
    This is separate because relations reference other issues that need to exist first.

    Usage:
        python manage.py migrate_issue_relations
    """
    help = "Migrate IssueRelations to PageRelations (run after migrate_issues_to_pages)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--workspace",
            type=str,
            help="Workspace slug to migrate.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be migrated without making changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        workspace_slug = options.get("workspace")

        # Get workspaces to process
        if workspace_slug:
            workspaces = Workspace.objects.filter(slug=workspace_slug)
        else:
            workspaces = Workspace.objects.all()

        for workspace in workspaces:
            self.migrate_workspace_relations(workspace, dry_run)

    def migrate_workspace_relations(self, workspace, dry_run):
        """Migrate all issue relations in a workspace."""
        self.stdout.write(f"\nProcessing relations for workspace: {workspace.name}")

        # Build issue->page mapping
        mappings = {
            m.issue_id: m.page_id
            for m in IssueToPageMapping.objects.filter(workspace=workspace)
        }

        # Get all relations
        relations = IssueRelation.objects.filter(
            workspace=workspace,
            deleted_at__isnull=True,
        )

        migrated = 0
        skipped = 0

        for relation in relations:
            # Check if both issues have been migrated
            if relation.issue_id not in mappings:
                skipped += 1
                continue
            if relation.related_issue_id not in mappings:
                skipped += 1
                continue

            page_id = mappings[relation.issue_id]
            related_page_id = mappings[relation.related_issue_id]

            # Map relation type
            relation_type = RELATION_TYPE_MAP.get(
                relation.relation, PageRelationChoices.RELATES_TO
            )

            if not dry_run:
                PageRelation.objects.get_or_create(
                    workspace=workspace,
                    page_id=page_id,
                    related_page_id=related_page_id,
                    defaults={
                        "relation_type": relation_type,
                        "created_by": relation.created_by,
                        "updated_by": relation.updated_by,
                    }
                )
            migrated += 1

        self.stdout.write(
            f"  Migrated {migrated} relations, skipped {skipped}"
        )

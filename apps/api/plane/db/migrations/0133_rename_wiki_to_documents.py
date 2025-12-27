# Generated migration to rename Wiki to Documents
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0132_contract"),
    ]

    operations = [
        # ======================
        # PHASE 1: Rename Models
        # ======================
        migrations.RenameModel(
            old_name="WikiCollection",
            new_name="DocumentCollection",
        ),
        migrations.RenameModel(
            old_name="WikiPage",
            new_name="Document",
        ),
        migrations.RenameModel(
            old_name="WikiPageLabel",
            new_name="DocumentLabel",
        ),
        migrations.RenameModel(
            old_name="WikiPageAssignee",
            new_name="DocumentAssignee",
        ),
        migrations.RenameModel(
            old_name="WikiPageShare",
            new_name="DocumentShare",
        ),
        migrations.RenameModel(
            old_name="WikiPageVersion",
            new_name="DocumentVersion",
        ),
        migrations.RenameModel(
            old_name="WikiPageAccessLog",
            new_name="DocumentAccessLog",
        ),
        migrations.RenameModel(
            old_name="PageComment",
            new_name="DocumentComment",
        ),
        migrations.RenameModel(
            old_name="PageCommentReaction",
            new_name="DocumentCommentReaction",
        ),
        migrations.RenameModel(
            old_name="PageActivity",
            new_name="DocumentActivity",
        ),
        migrations.RenameModel(
            old_name="PageSubscriber",
            new_name="DocumentSubscriber",
        ),
        migrations.RenameModel(
            old_name="PageMention",
            new_name="DocumentMention",
        ),
        migrations.RenameModel(
            old_name="PageRelation",
            new_name="DocumentRelation",
        ),
        migrations.RenameModel(
            old_name="PageLink",
            new_name="DocumentLink",
        ),
        migrations.RenameModel(
            old_name="IssueToPageMapping",
            new_name="IssueToDocumentMapping",
        ),
        migrations.RenameModel(
            old_name="PagePropertyValue",
            new_name="DocumentPropertyValue",
        ),

        # ========================
        # PHASE 2: Rename Tables
        # ========================
        migrations.AlterModelTable(
            name="documentcollection",
            table="document_collections",
        ),
        migrations.AlterModelTable(
            name="document",
            table="documents",
        ),
        migrations.AlterModelTable(
            name="documentlabel",
            table="document_labels",
        ),
        migrations.AlterModelTable(
            name="documentassignee",
            table="document_assignees",
        ),
        migrations.AlterModelTable(
            name="documentshare",
            table="document_shares",
        ),
        migrations.AlterModelTable(
            name="documentversion",
            table="document_versions",
        ),
        migrations.AlterModelTable(
            name="documentaccesslog",
            table="document_access_logs",
        ),
        migrations.AlterModelTable(
            name="documentcomment",
            table="document_comments",
        ),
        migrations.AlterModelTable(
            name="documentcommentreaction",
            table="document_comment_reactions",
        ),
        migrations.AlterModelTable(
            name="documentactivity",
            table="document_activities",
        ),
        migrations.AlterModelTable(
            name="documentsubscriber",
            table="document_subscribers",
        ),
        migrations.AlterModelTable(
            name="documentmention",
            table="document_mentions",
        ),
        migrations.AlterModelTable(
            name="documentrelation",
            table="document_relations",
        ),
        migrations.AlterModelTable(
            name="documentlink",
            table="document_links",
        ),
        migrations.AlterModelTable(
            name="issuetodocumentmapping",
            table="issue_to_document_mappings",
        ),
        migrations.AlterModelTable(
            name="documentpropertyvalue",
            table="document_property_values",
        ),

        # ========================
        # PHASE 3: Rename Fields
        # ========================
        # Rename page field to document on all related models
        migrations.RenameField(
            model_name="documentlabel",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentassignee",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentshare",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentversion",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentaccesslog",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentcomment",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentactivity",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentactivity",
            old_name="page_comment",
            new_name="document_comment",
        ),
        migrations.RenameField(
            model_name="documentsubscriber",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentmention",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentrelation",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="documentrelation",
            old_name="related_page",
            new_name="related_document",
        ),
        migrations.RenameField(
            model_name="documentlink",
            old_name="page",
            new_name="document",
        ),
        migrations.RenameField(
            model_name="issuetodocumentmapping",
            old_name="page_id",
            new_name="document_id",
        ),
        migrations.RenameField(
            model_name="documentpropertyvalue",
            old_name="page",
            new_name="document",
        ),
        # Rename type discriminator field
        migrations.RenameField(
            model_name="document",
            old_name="page_type",
            new_name="document_type",
        ),
        # Rename page_types to document_types on PropertyDefinition
        migrations.RenameField(
            model_name="propertydefinition",
            old_name="page_types",
            new_name="document_types",
        ),
        # Rename page to document on FileAsset
        migrations.RenameField(
            model_name="fileasset",
            old_name="page",
            new_name="document",
        ),

        # ==============================
        # PHASE 4: Update Model Options
        # ==============================
        migrations.AlterModelOptions(
            name="documentcollection",
            options={
                "ordering": ("sort_order", "name"),
                "verbose_name": "Document Collection",
                "verbose_name_plural": "Document Collections",
            },
        ),
        migrations.AlterModelOptions(
            name="document",
            options={
                "ordering": ("sort_order", "-created_at"),
                "verbose_name": "Document",
                "verbose_name_plural": "Documents",
            },
        ),
        migrations.AlterModelOptions(
            name="documentlabel",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Label",
                "verbose_name_plural": "Document Labels",
            },
        ),
        migrations.AlterModelOptions(
            name="documentassignee",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Assignee",
                "verbose_name_plural": "Document Assignees",
            },
        ),
        migrations.AlterModelOptions(
            name="documentshare",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Share",
                "verbose_name_plural": "Document Shares",
            },
        ),
        migrations.AlterModelOptions(
            name="documentversion",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Version",
                "verbose_name_plural": "Document Versions",
            },
        ),
        migrations.AlterModelOptions(
            name="documentaccesslog",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Access Log",
                "verbose_name_plural": "Document Access Logs",
            },
        ),
        migrations.AlterModelOptions(
            name="documentcomment",
            options={
                "ordering": ("created_at",),
                "verbose_name": "Document Comment",
                "verbose_name_plural": "Document Comments",
            },
        ),
        migrations.AlterModelOptions(
            name="documentcommentreaction",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Comment Reaction",
                "verbose_name_plural": "Document Comment Reactions",
            },
        ),
        migrations.AlterModelOptions(
            name="documentactivity",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Activity",
                "verbose_name_plural": "Document Activities",
            },
        ),
        migrations.AlterModelOptions(
            name="documentsubscriber",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Subscriber",
                "verbose_name_plural": "Document Subscribers",
            },
        ),
        migrations.AlterModelOptions(
            name="documentmention",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Mention",
                "verbose_name_plural": "Document Mentions",
            },
        ),
        migrations.AlterModelOptions(
            name="documentrelation",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Relation",
                "verbose_name_plural": "Document Relations",
            },
        ),
        migrations.AlterModelOptions(
            name="documentlink",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Link",
                "verbose_name_plural": "Document Links",
            },
        ),
        migrations.AlterModelOptions(
            name="issuetodocumentmapping",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Issue to Document Mapping",
                "verbose_name_plural": "Issue to Document Mappings",
            },
        ),
        migrations.AlterModelOptions(
            name="documentpropertyvalue",
            options={
                "ordering": ("-created_at",),
                "verbose_name": "Document Property Value",
                "verbose_name_plural": "Document Property Values",
            },
        ),

        # ================================
        # PHASE 5: Remove Old Constraints
        # ================================
        migrations.RemoveConstraint(
            model_name="documentshare",
            name="wiki_page_share_unique_when_not_deleted",
        ),
        migrations.RemoveConstraint(
            model_name="documentlabel",
            name="wiki_page_label_unique_when_not_deleted",
        ),
        migrations.RemoveConstraint(
            model_name="documentassignee",
            name="wiki_page_assignee_unique_when_not_deleted",
        ),
        migrations.RemoveConstraint(
            model_name="documentsubscriber",
            name="page_subscriber_unique_when_not_deleted",
        ),
        migrations.RemoveConstraint(
            model_name="documentmention",
            name="page_mention_unique_when_not_deleted",
        ),
        migrations.RemoveConstraint(
            model_name="documentrelation",
            name="page_relation_unique_when_not_deleted",
        ),
        migrations.RemoveConstraint(
            model_name="documentcommentreaction",
            name="page_comment_reaction_unique_when_not_deleted",
        ),
        migrations.RemoveConstraint(
            model_name="documentpropertyvalue",
            name="page_prop_value_unique_when_not_deleted",
        ),

        # ================================
        # PHASE 6: Add New Constraints
        # ================================
        migrations.AddConstraint(
            model_name="documentshare",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("document", "user"),
                name="document_share_unique_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="documentlabel",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("document", "label"),
                name="document_label_unique_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="documentassignee",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("document", "assignee"),
                name="document_assignee_unique_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="documentsubscriber",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("document", "subscriber"),
                name="document_subscriber_unique_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="documentmention",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("document", "mentioned_user"),
                name="document_mention_unique_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="documentrelation",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("document", "related_document", "relation_type"),
                name="document_relation_unique_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="documentcommentreaction",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("comment", "actor", "reaction"),
                name="document_comment_reaction_unique_when_not_deleted",
            ),
        ),
        migrations.AddConstraint(
            model_name="documentpropertyvalue",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("document", "property"),
                name="doc_prop_value_unique_when_not_deleted",
            ),
        ),

        # ================================
        # PHASE 7: Rename Indexes using SQL
        # ================================
        # DocumentCollection indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikicoll_ws_parent_idx RENAME TO doccoll_ws_parent_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doccoll_ws_parent_idx RENAME TO wikicoll_ws_parent_idx;",
        ),
        # Document (WikiPage) indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipage_ws_coll_idx RENAME TO doc_ws_coll_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doc_ws_coll_idx RENAME TO wikipage_ws_coll_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipage_ws_parent_idx RENAME TO doc_ws_parent_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doc_ws_parent_idx RENAME TO wikipage_ws_parent_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipage_ws_access_idx RENAME TO doc_ws_access_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doc_ws_access_idx RENAME TO wikipage_ws_access_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipage_ws_owner_idx RENAME TO doc_ws_owner_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doc_ws_owner_idx RENAME TO wikipage_ws_owner_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipage_search_idx RENAME TO doc_search_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doc_search_idx RENAME TO wikipage_search_idx;",
        ),
        # DocumentShare indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikishare_page_user_idx RENAME TO docshare_doc_user_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docshare_doc_user_idx RENAME TO wikishare_page_user_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikishare_user_perm_idx RENAME TO docshare_user_perm_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docshare_user_perm_idx RENAME TO wikishare_user_perm_idx;",
        ),
        # DocumentVersion indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikiversion_page_date_idx RENAME TO docversion_doc_date_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docversion_doc_date_idx RENAME TO wikiversion_page_date_idx;",
        ),
        # DocumentAccessLog indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikilog_page_date_idx RENAME TO doclog_doc_date_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doclog_doc_date_idx RENAME TO wikilog_page_date_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikilog_user_date_idx RENAME TO doclog_user_date_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doclog_user_date_idx RENAME TO wikilog_user_date_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikilog_ws_type_idx RENAME TO doclog_ws_type_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doclog_ws_type_idx RENAME TO wikilog_ws_type_idx;",
        ),
        # DocumentLabel indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipagelabel_page_label_idx RENAME TO doclabel_doc_label_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doclabel_doc_label_idx RENAME TO wikipagelabel_page_label_idx;",
        ),
        # DocumentAssignee indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipageassignee_page_user_idx RENAME TO docassign_doc_user_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docassign_doc_user_idx RENAME TO wikipageassignee_page_user_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipageassignee_user_idx RENAME TO docassign_user_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docassign_user_idx RENAME TO wikipageassignee_user_idx;",
        ),
        # DocumentComment indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagecomment_page_date_idx RENAME TO doccomment_doc_date_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doccomment_doc_date_idx RENAME TO pagecomment_page_date_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagecomment_actor_idx RENAME TO doccomment_actor_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doccomment_actor_idx RENAME TO pagecomment_actor_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagecomment_ws_page_idx RENAME TO doccomment_ws_doc_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doccomment_ws_doc_idx RENAME TO pagecomment_ws_page_idx;",
        ),
        # DocumentCommentReaction indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagecomreact_comment_idx RENAME TO doccomreact_comment_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doccomreact_comment_idx RENAME TO pagecomreact_comment_idx;",
        ),
        # DocumentActivity indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pageactivity_page_date_idx RENAME TO docactivity_doc_date_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docactivity_doc_date_idx RENAME TO pageactivity_page_date_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pageactivity_actor_idx RENAME TO docactivity_actor_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docactivity_actor_idx RENAME TO pageactivity_actor_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pageactivity_ws_verb_idx RENAME TO docactivity_ws_verb_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docactivity_ws_verb_idx RENAME TO pageactivity_ws_verb_idx;",
        ),
        # DocumentSubscriber indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagesubscriber_page_idx RENAME TO docsubscriber_doc_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docsubscriber_doc_idx RENAME TO pagesubscriber_page_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagesubscriber_user_idx RENAME TO docsubscriber_user_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docsubscriber_user_idx RENAME TO pagesubscriber_user_idx;",
        ),
        # DocumentMention indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagemention_page_idx RENAME TO docmention_doc_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docmention_doc_idx RENAME TO pagemention_page_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagemention_user_idx RENAME TO docmention_user_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docmention_user_idx RENAME TO pagemention_user_idx;",
        ),
        # DocumentRelation indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagerelation_page_idx RENAME TO docrelation_doc_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docrelation_doc_idx RENAME TO pagerelation_page_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagerelation_related_idx RENAME TO docrelation_related_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docrelation_related_idx RENAME TO pagerelation_related_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagerelation_type_idx RENAME TO docrelation_type_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docrelation_type_idx RENAME TO pagerelation_type_idx;",
        ),
        # DocumentLink indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pagelink_page_idx RENAME TO doclink_doc_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doclink_doc_idx RENAME TO pagelink_page_idx;",
        ),
        # IssueToDocumentMapping indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS issue_page_mapping_idx RENAME TO issue_doc_mapping_idx;",
            reverse_sql="ALTER INDEX IF EXISTS issue_doc_mapping_idx RENAME TO issue_page_mapping_idx;",
        ),
        # DocumentPropertyValue indexes
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pageprop_page_prop_idx RENAME TO docprop_doc_prop_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docprop_doc_prop_idx RENAME TO pageprop_page_prop_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pageprop_ws_prop_idx RENAME TO docprop_ws_prop_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docprop_ws_prop_idx RENAME TO pageprop_ws_prop_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pageprop_date_idx RENAME TO docprop_date_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docprop_date_idx RENAME TO pageprop_date_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS pageprop_datetime_idx RENAME TO docprop_datetime_idx;",
            reverse_sql="ALTER INDEX IF EXISTS docprop_datetime_idx RENAME TO pageprop_datetime_idx;",
        ),
        # Document type discriminator indexes (page_type -> document_type)
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipage_ws_type_idx RENAME TO doc_ws_doctype_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doc_ws_doctype_idx RENAME TO wikipage_ws_type_idx;",
        ),
        migrations.RunSQL(
            sql="ALTER INDEX IF EXISTS wikipage_proj_type_idx RENAME TO doc_proj_doctype_idx;",
            reverse_sql="ALTER INDEX IF EXISTS doc_proj_doctype_idx RENAME TO wikipage_proj_type_idx;",
        ),
    ]

# Generated migration to rename wiki indexes and constraints to document naming
# This completes the wiki -> documents rename by cleaning up internal database object names

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0133_rename_wiki_to_documents"),
    ]

    operations = [
        # =====================================================================
        # DOCUMENTS TABLE (formerly wiki_pages)
        # =====================================================================

        # Primary key
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_pkey RENAME TO documents_pkey;",
            "ALTER INDEX documents_pkey RENAME TO wiki_pages_pkey;",
        ),

        # Foreign key indexes
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_created_by_id_ffb8de54 RENAME TO documents_created_by_id_idx;",
            "ALTER INDEX documents_created_by_id_idx RENAME TO wiki_pages_created_by_id_ffb8de54;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_updated_by_id_e347e722 RENAME TO documents_updated_by_id_idx;",
            "ALTER INDEX documents_updated_by_id_idx RENAME TO wiki_pages_updated_by_id_e347e722;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_owned_by_id_5c776ff0 RENAME TO documents_owned_by_id_idx;",
            "ALTER INDEX documents_owned_by_id_idx RENAME TO wiki_pages_owned_by_id_5c776ff0;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_locked_by_id_6d1b1705 RENAME TO documents_locked_by_id_idx;",
            "ALTER INDEX documents_locked_by_id_idx RENAME TO wiki_pages_locked_by_id_6d1b1705;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_collection_id_e5f86844 RENAME TO documents_collection_id_idx;",
            "ALTER INDEX documents_collection_id_idx RENAME TO wiki_pages_collection_id_e5f86844;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_parent_id_84ac940f RENAME TO documents_parent_id_idx;",
            "ALTER INDEX documents_parent_id_idx RENAME TO wiki_pages_parent_id_84ac940f;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_workspace_id_5c421a6b RENAME TO documents_workspace_id_idx;",
            "ALTER INDEX documents_workspace_id_idx RENAME TO wiki_pages_workspace_id_5c421a6b;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_project_id_85fff472 RENAME TO documents_project_id_idx;",
            "ALTER INDEX documents_project_id_idx RENAME TO wiki_pages_project_id_85fff472;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_state_id_f1e57fd9 RENAME TO documents_state_id_idx;",
            "ALTER INDEX documents_state_id_idx RENAME TO wiki_pages_state_id_f1e57fd9;",
        ),

        # Document type indexes
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_page_type_c99aad97 RENAME TO documents_document_type_idx;",
            "ALTER INDEX documents_document_type_idx RENAME TO wiki_pages_page_type_c99aad97;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_pages_page_type_c99aad97_like RENAME TO documents_document_type_like_idx;",
            "ALTER INDEX documents_document_type_like_idx RENAME TO wiki_pages_page_type_c99aad97_like;",
        ),

        # Composite indexes
        migrations.RunSQL(
            "ALTER INDEX wikipage_ws_proj_idx RENAME TO document_ws_proj_idx;",
            "ALTER INDEX document_ws_proj_idx RENAME TO wikipage_ws_proj_idx;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wikipage_proj_seq_idx RENAME TO document_proj_seq_idx;",
            "ALTER INDEX document_proj_seq_idx RENAME TO wikipage_proj_seq_idx;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wikipage_ws_state_idx RENAME TO document_ws_state_idx;",
            "ALTER INDEX document_ws_state_idx RENAME TO wikipage_ws_state_idx;",
        ),

        # Constraints
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_access_check TO documents_access_check;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_access_check TO wiki_pages_access_check;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_collection_id_e5f86844_fk_wiki_collections_id TO documents_collection_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_collection_id_fk TO wiki_pages_collection_id_e5f86844_fk_wiki_collections_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_created_by_id_ffb8de54_fk_users_id TO documents_created_by_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_created_by_id_fk TO wiki_pages_created_by_id_ffb8de54_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_locked_by_id_6d1b1705_fk_users_id TO documents_locked_by_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_locked_by_id_fk TO wiki_pages_locked_by_id_6d1b1705_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_owned_by_id_5c776ff0_fk_users_id TO documents_owned_by_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_owned_by_id_fk TO wiki_pages_owned_by_id_5c776ff0_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_parent_id_84ac940f_fk_wiki_pages_id TO documents_parent_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_parent_id_fk TO wiki_pages_parent_id_84ac940f_fk_wiki_pages_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_project_id_85fff472_fk_projects_id TO documents_project_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_project_id_fk TO wiki_pages_project_id_85fff472_fk_projects_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_state_id_f1e57fd9_fk_states_id TO documents_state_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_state_id_fk TO wiki_pages_state_id_f1e57fd9_fk_states_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_updated_by_id_e347e722_fk_users_id TO documents_updated_by_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_updated_by_id_fk TO wiki_pages_updated_by_id_e347e722_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE documents RENAME CONSTRAINT wiki_pages_workspace_id_5c421a6b_fk_workspaces_id TO documents_workspace_id_fk;",
            "ALTER TABLE documents RENAME CONSTRAINT documents_workspace_id_fk TO wiki_pages_workspace_id_5c421a6b_fk_workspaces_id;",
        ),

        # =====================================================================
        # DOCUMENT_COLLECTIONS TABLE (formerly wiki_collections)
        # =====================================================================

        migrations.RunSQL(
            "ALTER INDEX wiki_collections_pkey RENAME TO document_collections_pkey;",
            "ALTER INDEX document_collections_pkey RENAME TO wiki_collections_pkey;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_collections_workspace_id_e45eb3b1 RENAME TO document_collections_workspace_id_idx;",
            "ALTER INDEX document_collections_workspace_id_idx RENAME TO wiki_collections_workspace_id_e45eb3b1;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_collections_created_by_id_2b20daf1 RENAME TO document_collections_created_by_id_idx;",
            "ALTER INDEX document_collections_created_by_id_idx RENAME TO wiki_collections_created_by_id_2b20daf1;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_collections_updated_by_id_4fa20544 RENAME TO document_collections_updated_by_id_idx;",
            "ALTER INDEX document_collections_updated_by_id_idx RENAME TO wiki_collections_updated_by_id_4fa20544;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_collections_parent_id_e1fd427c RENAME TO document_collections_parent_id_idx;",
            "ALTER INDEX document_collections_parent_id_idx RENAME TO wiki_collections_parent_id_e1fd427c;",
        ),

        # Constraints (note: pkey constraint is renamed automatically with index rename)
        migrations.RunSQL(
            "ALTER TABLE document_collections RENAME CONSTRAINT wiki_collections_created_by_id_2b20daf1_fk_users_id TO document_collections_created_by_id_fk;",
            "ALTER TABLE document_collections RENAME CONSTRAINT document_collections_created_by_id_fk TO wiki_collections_created_by_id_2b20daf1_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_collections RENAME CONSTRAINT wiki_collections_parent_id_e1fd427c_fk_wiki_collections_id TO document_collections_parent_id_fk;",
            "ALTER TABLE document_collections RENAME CONSTRAINT document_collections_parent_id_fk TO wiki_collections_parent_id_e1fd427c_fk_wiki_collections_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_collections RENAME CONSTRAINT wiki_collections_updated_by_id_4fa20544_fk_users_id TO document_collections_updated_by_id_fk;",
            "ALTER TABLE document_collections RENAME CONSTRAINT document_collections_updated_by_id_fk TO wiki_collections_updated_by_id_4fa20544_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_collections RENAME CONSTRAINT wiki_collections_workspace_id_e45eb3b1_fk_workspaces_id TO document_collections_workspace_id_fk;",
            "ALTER TABLE document_collections RENAME CONSTRAINT document_collections_workspace_id_fk TO wiki_collections_workspace_id_e45eb3b1_fk_workspaces_id;",
        ),

        # =====================================================================
        # DOCUMENT_SHARES TABLE (formerly wiki_page_shares)
        # =====================================================================

        migrations.RunSQL(
            "ALTER INDEX wiki_page_shares_pkey RENAME TO document_shares_pkey;",
            "ALTER INDEX document_shares_pkey RENAME TO wiki_page_shares_pkey;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_shares_page_id_e083ae5e RENAME TO document_shares_document_id_idx;",
            "ALTER INDEX document_shares_document_id_idx RENAME TO wiki_page_shares_page_id_e083ae5e;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_shares_user_id_4172c6e1 RENAME TO document_shares_user_id_idx;",
            "ALTER INDEX document_shares_user_id_idx RENAME TO wiki_page_shares_user_id_4172c6e1;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_shares_workspace_id_b68362f4 RENAME TO document_shares_workspace_id_idx;",
            "ALTER INDEX document_shares_workspace_id_idx RENAME TO wiki_page_shares_workspace_id_b68362f4;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_shares_created_by_id_0fe36a17 RENAME TO document_shares_created_by_id_idx;",
            "ALTER INDEX document_shares_created_by_id_idx RENAME TO wiki_page_shares_created_by_id_0fe36a17;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_shares_updated_by_id_eaac4663 RENAME TO document_shares_updated_by_id_idx;",
            "ALTER INDEX document_shares_updated_by_id_idx RENAME TO wiki_page_shares_updated_by_id_eaac4663;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_shares_page_id_user_id_deleted_at_2a8be4dd_uniq RENAME TO document_shares_document_user_deleted_uniq;",
            "ALTER INDEX document_shares_document_user_deleted_uniq RENAME TO wiki_page_shares_page_id_user_id_deleted_at_2a8be4dd_uniq;",
        ),

        # Constraints
        migrations.RunSQL(
            "ALTER TABLE document_shares RENAME CONSTRAINT wiki_page_shares_permission_check TO document_shares_permission_check;",
            "ALTER TABLE document_shares RENAME CONSTRAINT document_shares_permission_check TO wiki_page_shares_permission_check;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_shares RENAME CONSTRAINT wiki_page_shares_created_by_id_0fe36a17_fk_users_id TO document_shares_created_by_id_fk;",
            "ALTER TABLE document_shares RENAME CONSTRAINT document_shares_created_by_id_fk TO wiki_page_shares_created_by_id_0fe36a17_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_shares RENAME CONSTRAINT wiki_page_shares_updated_by_id_eaac4663_fk_users_id TO document_shares_updated_by_id_fk;",
            "ALTER TABLE document_shares RENAME CONSTRAINT document_shares_updated_by_id_fk TO wiki_page_shares_updated_by_id_eaac4663_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_shares RENAME CONSTRAINT wiki_page_shares_user_id_4172c6e1_fk_users_id TO document_shares_user_id_fk;",
            "ALTER TABLE document_shares RENAME CONSTRAINT document_shares_user_id_fk TO wiki_page_shares_user_id_4172c6e1_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_shares RENAME CONSTRAINT wiki_page_shares_workspace_id_b68362f4_fk_workspaces_id TO document_shares_workspace_id_fk;",
            "ALTER TABLE document_shares RENAME CONSTRAINT document_shares_workspace_id_fk TO wiki_page_shares_workspace_id_b68362f4_fk_workspaces_id;",
        ),

        # =====================================================================
        # DOCUMENT_VERSIONS TABLE (formerly wiki_page_versions)
        # =====================================================================

        migrations.RunSQL(
            "ALTER INDEX wiki_page_versions_pkey RENAME TO document_versions_pkey;",
            "ALTER INDEX document_versions_pkey RENAME TO wiki_page_versions_pkey;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_versions_page_id_6d30eba0 RENAME TO document_versions_document_id_idx;",
            "ALTER INDEX document_versions_document_id_idx RENAME TO wiki_page_versions_page_id_6d30eba0;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_versions_workspace_id_e1f7fdd3 RENAME TO document_versions_workspace_id_idx;",
            "ALTER INDEX document_versions_workspace_id_idx RENAME TO wiki_page_versions_workspace_id_e1f7fdd3;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_versions_owned_by_id_2daad0af RENAME TO document_versions_owned_by_id_idx;",
            "ALTER INDEX document_versions_owned_by_id_idx RENAME TO wiki_page_versions_owned_by_id_2daad0af;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_versions_created_by_id_82c73e91 RENAME TO document_versions_created_by_id_idx;",
            "ALTER INDEX document_versions_created_by_id_idx RENAME TO wiki_page_versions_created_by_id_82c73e91;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_versions_updated_by_id_9f3ed0b5 RENAME TO document_versions_updated_by_id_idx;",
            "ALTER INDEX document_versions_updated_by_id_idx RENAME TO wiki_page_versions_updated_by_id_9f3ed0b5;",
        ),

        # Constraints
        migrations.RunSQL(
            "ALTER TABLE document_versions RENAME CONSTRAINT wiki_page_versions_created_by_id_82c73e91_fk_users_id TO document_versions_created_by_id_fk;",
            "ALTER TABLE document_versions RENAME CONSTRAINT document_versions_created_by_id_fk TO wiki_page_versions_created_by_id_82c73e91_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_versions RENAME CONSTRAINT wiki_page_versions_owned_by_id_2daad0af_fk_users_id TO document_versions_owned_by_id_fk;",
            "ALTER TABLE document_versions RENAME CONSTRAINT document_versions_owned_by_id_fk TO wiki_page_versions_owned_by_id_2daad0af_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_versions RENAME CONSTRAINT wiki_page_versions_updated_by_id_9f3ed0b5_fk_users_id TO document_versions_updated_by_id_fk;",
            "ALTER TABLE document_versions RENAME CONSTRAINT document_versions_updated_by_id_fk TO wiki_page_versions_updated_by_id_9f3ed0b5_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_versions RENAME CONSTRAINT wiki_page_versions_workspace_id_e1f7fdd3_fk_workspaces_id TO document_versions_workspace_id_fk;",
            "ALTER TABLE document_versions RENAME CONSTRAINT document_versions_workspace_id_fk TO wiki_page_versions_workspace_id_e1f7fdd3_fk_workspaces_id;",
        ),

        # =====================================================================
        # DOCUMENT_ACCESS_LOGS TABLE (formerly wiki_page_access_logs)
        # =====================================================================

        migrations.RunSQL(
            "ALTER INDEX wiki_page_access_logs_pkey RENAME TO document_access_logs_pkey;",
            "ALTER INDEX document_access_logs_pkey RENAME TO wiki_page_access_logs_pkey;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_access_logs_page_id_de3beddc RENAME TO document_access_logs_document_id_idx;",
            "ALTER INDEX document_access_logs_document_id_idx RENAME TO wiki_page_access_logs_page_id_de3beddc;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_access_logs_user_id_55ebd10d RENAME TO document_access_logs_user_id_idx;",
            "ALTER INDEX document_access_logs_user_id_idx RENAME TO wiki_page_access_logs_user_id_55ebd10d;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_access_logs_workspace_id_73827c0d RENAME TO document_access_logs_workspace_id_idx;",
            "ALTER INDEX document_access_logs_workspace_id_idx RENAME TO wiki_page_access_logs_workspace_id_73827c0d;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_access_logs_created_by_id_cb2bb668 RENAME TO document_access_logs_created_by_id_idx;",
            "ALTER INDEX document_access_logs_created_by_id_idx RENAME TO wiki_page_access_logs_created_by_id_cb2bb668;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_access_logs_updated_by_id_656f87e6 RENAME TO document_access_logs_updated_by_id_idx;",
            "ALTER INDEX document_access_logs_updated_by_id_idx RENAME TO wiki_page_access_logs_updated_by_id_656f87e6;",
        ),

        # Constraints
        migrations.RunSQL(
            "ALTER TABLE document_access_logs RENAME CONSTRAINT wiki_page_access_logs_created_by_id_cb2bb668_fk_users_id TO document_access_logs_created_by_id_fk;",
            "ALTER TABLE document_access_logs RENAME CONSTRAINT document_access_logs_created_by_id_fk TO wiki_page_access_logs_created_by_id_cb2bb668_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_access_logs RENAME CONSTRAINT wiki_page_access_logs_updated_by_id_656f87e6_fk_users_id TO document_access_logs_updated_by_id_fk;",
            "ALTER TABLE document_access_logs RENAME CONSTRAINT document_access_logs_updated_by_id_fk TO wiki_page_access_logs_updated_by_id_656f87e6_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_access_logs RENAME CONSTRAINT wiki_page_access_logs_user_id_55ebd10d_fk_users_id TO document_access_logs_user_id_fk;",
            "ALTER TABLE document_access_logs RENAME CONSTRAINT document_access_logs_user_id_fk TO wiki_page_access_logs_user_id_55ebd10d_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_access_logs RENAME CONSTRAINT wiki_page_access_logs_workspace_id_73827c0d_fk_workspaces_id TO document_access_logs_workspace_id_fk;",
            "ALTER TABLE document_access_logs RENAME CONSTRAINT document_access_logs_workspace_id_fk TO wiki_page_access_logs_workspace_id_73827c0d_fk_workspaces_id;",
        ),

        # =====================================================================
        # DOCUMENT_LABELS TABLE (formerly wiki_page_labels)
        # =====================================================================

        migrations.RunSQL(
            "ALTER INDEX wiki_page_labels_pkey RENAME TO document_labels_pkey;",
            "ALTER INDEX document_labels_pkey RENAME TO wiki_page_labels_pkey;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_labels_page_id_e892870a RENAME TO document_labels_document_id_idx;",
            "ALTER INDEX document_labels_document_id_idx RENAME TO wiki_page_labels_page_id_e892870a;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_labels_label_id_1264c183 RENAME TO document_labels_label_id_idx;",
            "ALTER INDEX document_labels_label_id_idx RENAME TO wiki_page_labels_label_id_1264c183;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_labels_workspace_id_854f8b23 RENAME TO document_labels_workspace_id_idx;",
            "ALTER INDEX document_labels_workspace_id_idx RENAME TO wiki_page_labels_workspace_id_854f8b23;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_labels_created_by_id_87249fd7 RENAME TO document_labels_created_by_id_idx;",
            "ALTER INDEX document_labels_created_by_id_idx RENAME TO wiki_page_labels_created_by_id_87249fd7;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_labels_updated_by_id_15c260fe RENAME TO document_labels_updated_by_id_idx;",
            "ALTER INDEX document_labels_updated_by_id_idx RENAME TO wiki_page_labels_updated_by_id_15c260fe;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_labels_page_id_label_id_deleted_at_b0fee80f_uniq RENAME TO document_labels_document_label_deleted_uniq;",
            "ALTER INDEX document_labels_document_label_deleted_uniq RENAME TO wiki_page_labels_page_id_label_id_deleted_at_b0fee80f_uniq;",
        ),

        # Constraints
        migrations.RunSQL(
            "ALTER TABLE document_labels RENAME CONSTRAINT wiki_page_labels_created_by_id_87249fd7_fk_users_id TO document_labels_created_by_id_fk;",
            "ALTER TABLE document_labels RENAME CONSTRAINT document_labels_created_by_id_fk TO wiki_page_labels_created_by_id_87249fd7_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_labels RENAME CONSTRAINT wiki_page_labels_label_id_1264c183_fk_labels_id TO document_labels_label_id_fk;",
            "ALTER TABLE document_labels RENAME CONSTRAINT document_labels_label_id_fk TO wiki_page_labels_label_id_1264c183_fk_labels_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_labels RENAME CONSTRAINT wiki_page_labels_updated_by_id_15c260fe_fk_users_id TO document_labels_updated_by_id_fk;",
            "ALTER TABLE document_labels RENAME CONSTRAINT document_labels_updated_by_id_fk TO wiki_page_labels_updated_by_id_15c260fe_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_labels RENAME CONSTRAINT wiki_page_labels_workspace_id_854f8b23_fk_workspaces_id TO document_labels_workspace_id_fk;",
            "ALTER TABLE document_labels RENAME CONSTRAINT document_labels_workspace_id_fk TO wiki_page_labels_workspace_id_854f8b23_fk_workspaces_id;",
        ),

        # =====================================================================
        # DOCUMENT_ASSIGNEES TABLE (formerly wiki_page_assignees)
        # =====================================================================

        migrations.RunSQL(
            "ALTER INDEX wiki_page_assignees_pkey RENAME TO document_assignees_pkey;",
            "ALTER INDEX document_assignees_pkey RENAME TO wiki_page_assignees_pkey;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_assignees_page_id_b1b96bf4 RENAME TO document_assignees_document_id_idx;",
            "ALTER INDEX document_assignees_document_id_idx RENAME TO wiki_page_assignees_page_id_b1b96bf4;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_assignees_assignee_id_bf842452 RENAME TO document_assignees_assignee_id_idx;",
            "ALTER INDEX document_assignees_assignee_id_idx RENAME TO wiki_page_assignees_assignee_id_bf842452;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_assignees_workspace_id_422afbf6 RENAME TO document_assignees_workspace_id_idx;",
            "ALTER INDEX document_assignees_workspace_id_idx RENAME TO wiki_page_assignees_workspace_id_422afbf6;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_assignees_created_by_id_1c03b20e RENAME TO document_assignees_created_by_id_idx;",
            "ALTER INDEX document_assignees_created_by_id_idx RENAME TO wiki_page_assignees_created_by_id_1c03b20e;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_assignees_updated_by_id_a40dc640 RENAME TO document_assignees_updated_by_id_idx;",
            "ALTER INDEX document_assignees_updated_by_id_idx RENAME TO wiki_page_assignees_updated_by_id_a40dc640;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wiki_page_assignees_page_id_assignee_id_dele_77eecf60_uniq RENAME TO document_assignees_document_assignee_deleted_uniq;",
            "ALTER INDEX document_assignees_document_assignee_deleted_uniq RENAME TO wiki_page_assignees_page_id_assignee_id_dele_77eecf60_uniq;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wikipageassign_page_user_idx RENAME TO document_assign_document_user_idx;",
            "ALTER INDEX document_assign_document_user_idx RENAME TO wikipageassign_page_user_idx;",
        ),
        migrations.RunSQL(
            "ALTER INDEX wikipageassign_user_idx RENAME TO document_assign_user_idx;",
            "ALTER INDEX document_assign_user_idx RENAME TO wikipageassign_user_idx;",
        ),

        # Constraints
        migrations.RunSQL(
            "ALTER TABLE document_assignees RENAME CONSTRAINT wiki_page_assignees_assignee_id_bf842452_fk_users_id TO document_assignees_assignee_id_fk;",
            "ALTER TABLE document_assignees RENAME CONSTRAINT document_assignees_assignee_id_fk TO wiki_page_assignees_assignee_id_bf842452_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_assignees RENAME CONSTRAINT wiki_page_assignees_created_by_id_1c03b20e_fk_users_id TO document_assignees_created_by_id_fk;",
            "ALTER TABLE document_assignees RENAME CONSTRAINT document_assignees_created_by_id_fk TO wiki_page_assignees_created_by_id_1c03b20e_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_assignees RENAME CONSTRAINT wiki_page_assignees_updated_by_id_a40dc640_fk_users_id TO document_assignees_updated_by_id_fk;",
            "ALTER TABLE document_assignees RENAME CONSTRAINT document_assignees_updated_by_id_fk TO wiki_page_assignees_updated_by_id_a40dc640_fk_users_id;",
        ),
        migrations.RunSQL(
            "ALTER TABLE document_assignees RENAME CONSTRAINT wiki_page_assignees_workspace_id_422afbf6_fk_workspaces_id TO document_assignees_workspace_id_fk;",
            "ALTER TABLE document_assignees RENAME CONSTRAINT document_assignees_workspace_id_fk TO wiki_page_assignees_workspace_id_422afbf6_fk_workspaces_id;",
        ),
    ]

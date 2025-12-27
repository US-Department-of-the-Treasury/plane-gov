# Generated migration to drop legacy pages tables and fix file_assets FK
# The pages tables were from an older upstream Plane feature that we're not using.
# file_assets.document_id should point to our documents table instead of pages.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0134_rename_wiki_indexes_constraints"),
    ]

    operations = [
        # Step 1: Drop the FK from file_assets.document_id to pages
        migrations.RunSQL(
            "ALTER TABLE file_assets DROP CONSTRAINT IF EXISTS file_assets_document_id_d02465c4_fk_pages_id;",
            "ALTER TABLE file_assets ADD CONSTRAINT file_assets_document_id_d02465c4_fk_pages_id FOREIGN KEY (document_id) REFERENCES pages(id) DEFERRABLE INITIALLY DEFERRED;",
        ),

        # Step 2: Drop project_pages table (references pages)
        migrations.RunSQL(
            "DROP TABLE IF EXISTS project_pages CASCADE;",
            migrations.RunSQL.noop,  # No reverse - table is empty and unused
        ),

        # Step 3: Drop page_labels table (references pages)
        migrations.RunSQL(
            "DROP TABLE IF EXISTS page_labels CASCADE;",
            migrations.RunSQL.noop,
        ),

        # Step 4: Drop page_logs table (references pages)
        migrations.RunSQL(
            "DROP TABLE IF EXISTS page_logs CASCADE;",
            migrations.RunSQL.noop,
        ),

        # Step 5: Drop page_versions table (references pages)
        migrations.RunSQL(
            "DROP TABLE IF EXISTS page_versions CASCADE;",
            migrations.RunSQL.noop,
        ),

        # Step 6: Drop pages table
        migrations.RunSQL(
            "DROP TABLE IF EXISTS pages CASCADE;",
            migrations.RunSQL.noop,
        ),

        # Step 7: Add FK from file_assets.document_id to documents table
        migrations.RunSQL(
            "ALTER TABLE file_assets ADD CONSTRAINT file_assets_document_id_fk_documents FOREIGN KEY (document_id) REFERENCES documents(id) DEFERRABLE INITIALLY DEFERRED;",
            "ALTER TABLE file_assets DROP CONSTRAINT IF EXISTS file_assets_document_id_fk_documents;",
        ),

        # Step 8: Rename the index for consistency
        migrations.RunSQL(
            "ALTER INDEX IF EXISTS file_assets_page_id_64c753d1 RENAME TO file_assets_document_id_idx;",
            "ALTER INDEX IF EXISTS file_assets_document_id_idx RENAME TO file_assets_page_id_64c753d1;",
        ),
    ]

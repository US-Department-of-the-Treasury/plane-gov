"use client";

import { memo, useState, useCallback } from "react";
import { Save, Eye, Edit3, Lock } from "lucide-react";
// plane imports
import { cn } from "@plane/utils";
import { Tooltip } from "@plane/ui";
// queries
import { useUpdateWikiPage, useUpdateWikiPageDescription } from "@/store/queries";
// types
import type { TWikiPageDetail } from "@plane/types";

interface WikiPageEditorProps {
  workspaceSlug: string;
  pageId: string;
  page: TWikiPageDetail;
}

type EditorMode = "edit" | "preview";

/**
 * WikiPageEditor - Placeholder component for wiki page editing
 *
 * Phase 5 will integrate:
 * - TipTap editor with existing Plane editor components
 * - Hocuspocus for real-time collaboration
 * - Yjs for conflict-free document sync
 * - Presence indicators showing who's editing
 * - Auto-save with debouncing
 * - Image upload and embedding
 * - @mentions and internal page linking
 */
export const WikiPageEditor = memo(function WikiPageEditor({
  workspaceSlug,
  pageId,
  page,
}: WikiPageEditorProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [title, setTitle] = useState(page.name);
  const [content, setContent] = useState(page.description_html || "");
  const [isSaving, setIsSaving] = useState(false);

  const updatePageMutation = useUpdateWikiPage();
  const updateDescriptionMutation = useUpdateWikiPageDescription();

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Update title if changed
      if (title !== page.name) {
        await updatePageMutation.mutateAsync({
          workspaceSlug,
          pageId,
          data: { name: title },
        });
      }

      // Update content if changed
      if (content !== page.description_html) {
        // Phase 5 will integrate TipTap with proper binary/JSON formats
        // For now, pass HTML with placeholder values for binary and JSON
        await updateDescriptionMutation.mutateAsync({
          workspaceSlug,
          pageId,
          data: {
            description_html: content,
            description_binary: "",
            description: {},
          },
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    content,
    page.name,
    page.description_html,
    workspaceSlug,
    pageId,
    updatePageMutation,
    updateDescriptionMutation,
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-custom-border-200 bg-custom-background-100">
        <div className="flex items-center gap-2">
          {page.is_locked && (
            <div className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">
              <Lock className="size-3" />
              <span>Locked</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center border border-custom-border-200 rounded-md">
            <Tooltip tooltipContent="Edit mode">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-l-md",
                  editorMode === "edit"
                    ? "bg-custom-background-80"
                    : "hover:bg-custom-background-80"
                )}
                onClick={() => setEditorMode("edit")}
              >
                <Edit3 className="size-3.5" />
                <span>Edit</span>
              </button>
            </Tooltip>
            <Tooltip tooltipContent="Preview mode">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-r-md",
                  editorMode === "preview"
                    ? "bg-custom-background-80"
                    : "hover:bg-custom-background-80"
                )}
                onClick={() => setEditorMode("preview")}
              >
                <Eye className="size-3.5" />
                <span>Preview</span>
              </button>
            </Tooltip>
          </div>

          {/* Save button */}
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md",
              "bg-custom-primary-100 text-white hover:bg-custom-primary-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="size-4" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-custom-text-400 mb-6"
            disabled={editorMode === "preview"}
          />

          {/* Content area */}
          {editorMode === "edit" ? (
            <div className="prose prose-sm max-w-none">
              {/*
                TODO (Phase 5): Replace with TipTap editor
                - Import DocumentEditor from @plane/editor-core
                - Configure Hocuspocus provider for real-time sync
                - Add collaboration awareness (cursors, selections)
                - Implement auto-save with debouncing
              */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing..."
                className="w-full min-h-[500px] bg-transparent border border-custom-border-200 rounded-md p-4 outline-none resize-none focus:border-custom-primary-100"
              />
              <p className="text-xs text-custom-text-400 mt-2">
                Rich text editor with real-time collaboration will be integrated in Phase 5.
                For now, you can write plain HTML.
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {content ? (
                <div
                  className="wiki-content"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <p className="text-custom-text-400 italic">No content yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-custom-border-200 text-xs text-custom-text-400">
        <div className="flex items-center gap-4">
          <span>
            Last updated: {new Date(page.updated_at).toLocaleString()}
          </span>
          {page.updated_by_detail && (
            <span>by {page.updated_by_detail.display_name}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>{content.length} characters</span>
        </div>
      </div>
    </div>
  );
});

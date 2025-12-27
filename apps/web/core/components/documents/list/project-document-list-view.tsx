"use client";

import { memo, useMemo, useState } from "react";
// plane imports
import { Logo } from "@plane/propel/emoji-icon-picker";
import { cn } from "@plane/utils";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useProjectDocuments, buildDocumentTree } from "@/store/queries";
import type { TDocumentTreeNode } from "@/store/queries";
// components
import { CreateDocumentModal } from "@/components/documents/modals";
import { DocumentEmptyState, DocumentListSkeleton } from "@/components/documents/empty-states";
// store
import { useDocumentViewStore } from "@/store/document-view.store";

interface ProjectDocumentListViewProps {
  workspaceSlug: string;
  projectId: string;
}

type ViewMode = "grid" | "list";

const ProjectDocumentCard = memo(function ProjectDocumentCard({
  document,
  workspaceSlug,
  projectId,
  viewMode,
}: {
  document: TDocumentTreeNode;
  workspaceSlug: string;
  projectId: string;
  viewMode: ViewMode;
}) {
  const router = useAppRouter();
  const hasIcon = document.logo_props?.in_use;

  const handleClick = () => {
    router.push(`/${workspaceSlug}/projects/${projectId}/pages/${document.id}`);
  };

  if (viewMode === "list") {
    // Clean list row matching Projects view pattern
    return (
      <div
        role="button"
        tabIndex={0}
        className="group flex items-center gap-2.5 px-page-x py-2 min-h-11 hover:bg-layer-transparent-hover cursor-pointer rounded-sm transition-colors"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
      >
        {/* Icon */}
        <div className="flex-shrink-0 size-6 flex items-center justify-center">
          {hasIcon ? (
            <Logo logo={document.logo_props} size={22} type="lucide" />
          ) : (
            <span className="text-lg text-tertiary">📄</span>
          )}
        </div>
        <span className="flex-1 text-13 text-primary truncate">{document.name || "Untitled"}</span>
        {/* Date on hover */}
        <span className="text-11 text-placeholder opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(document.updated_at).toLocaleDateString()}
        </span>
      </div>
    );
  }

  // Grid view - card matching design system
  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex flex-col p-4 bg-surface-1 rounded-lg cursor-pointer transition-all duration-200 hover:bg-layer-transparent-hover border border-subtle"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* Icon at top */}
      <div className="mb-3">
        {hasIcon ? (
          <Logo logo={document.logo_props} size={42} type="lucide" />
        ) : (
          <span className="text-[42px] leading-none text-tertiary">📄</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-13 font-medium text-primary line-clamp-2 mb-1">{document.name || "Untitled"}</h3>

      {/* Description preview */}
      {document.description_stripped && (
        <p className="text-11 text-tertiary line-clamp-2">{document.description_stripped}</p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3">
        <span className="text-11 text-placeholder">{new Date(document.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
});

export const ProjectDocumentListView = memo(function ProjectDocumentListView({
  workspaceSlug,
  projectId,
}: ProjectDocumentListViewProps) {
  const { viewMode } = useDocumentViewStore();
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);

  // Query for project-specific documents
  const { data: documents, isLoading } = useProjectDocuments(workspaceSlug, projectId);

  // Build tree structure (filter out documents with collections for project documents)
  const documentTree = useMemo(() => {
    const tree = buildDocumentTree(documents);
    // For project documents, we only show documents without collections
    return tree.filter((p) => !p.collection);
  }, [documents]);

  const isEmpty = documentTree.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-page-x py-6">
        {isLoading ? (
          <DocumentListSkeleton count={6} />
        ) : isEmpty ? (
          <DocumentEmptyState
            type="no-documents"
            onAction={() => setIsCreateDocumentModalOpen(true)}
            actionLabel="Create your first document"
            className="h-64"
          />
        ) : (
          <div>
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  : "space-y-0.5"
              )}
            >
              {documentTree.map((doc) => (
                <ProjectDocumentCard
                  key={doc.id}
                  document={doc}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for empty state action */}
      <CreateDocumentModal
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        isOpen={isCreateDocumentModalOpen}
        onClose={() => setIsCreateDocumentModalOpen(false)}
      />
    </div>
  );
});

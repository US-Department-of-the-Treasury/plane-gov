"use client";

import { memo, useMemo, useState } from "react";
import { Bug, Milestone, CheckSquare } from "lucide-react";
// plane imports
import { Logo } from "@plane/propel/emoji-icon-picker";
import { cn } from "@plane/utils";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useDocuments, useDocumentCollections, buildDocumentTree, buildDocumentCollectionTree } from "@/store/queries";
import type { TDocumentTreeNode, TDocumentCollectionTreeNode } from "@/store/queries";
// types
import type { TDocumentType } from "@plane/types";

// components
import { CreateDocumentModal } from "@/components/documents/modals";
import { DocumentEmptyState, DocumentListSkeleton } from "@/components/documents/empty-states";
// store
import { useDocumentViewStore } from "@/store/document-view.store";

interface DocumentListViewProps {
  workspaceSlug: string;
}

type ViewMode = "grid" | "list";

// Type badge configuration - only for non-page types
const DOCUMENT_TYPE_BADGE_CONFIG: Record<
  Exclude<TDocumentType, "page">,
  { icon: React.FC<{ className?: string }>; color: string; label: string }
> = {
  issue: {
    icon: Bug,
    color: "text-orange-500 bg-orange-500/10",
    label: "Issue",
  },
  epic: {
    icon: Milestone,
    color: "text-purple-500 bg-purple-500/10",
    label: "Epic",
  },
  task: {
    icon: CheckSquare,
    color: "text-blue-500 bg-blue-500/10",
    label: "Task",
  },
};

const DocumentCard = memo(function DocumentCard({
  document,
  workspaceSlug,
  viewMode,
}: {
  document: TDocumentTreeNode;
  workspaceSlug: string;
  viewMode: ViewMode;
}) {
  const router = useAppRouter();
  const hasIcon = document.logo_props?.in_use;
  const documentType = document.document_type || "page";
  const typeBadge = documentType !== "page" ? DOCUMENT_TYPE_BADGE_CONFIG[documentType] : null;

  const handleClick = () => {
    router.push(`/${workspaceSlug}/documents/${document.id}`);
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
        {/* Type badge */}
        {typeBadge && (
          <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-10 font-medium", typeBadge.color)}>
            <typeBadge.icon className="size-3" />
            {typeBadge.label}
          </span>
        )}
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
      {/* Icon and type badge row */}
      <div className="flex items-start justify-between mb-3">
        {hasIcon ? (
          <Logo logo={document.logo_props} size={42} type="lucide" />
        ) : (
          <span className="text-[42px] leading-none text-tertiary">📄</span>
        )}
        {/* Type badge in top-right */}
        {typeBadge && (
          <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-10 font-medium", typeBadge.color)}>
            <typeBadge.icon className="size-3" />
            {typeBadge.label}
          </span>
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

const DocumentCollectionCard = memo(function DocumentCollectionCard({
  collection,
  documents,
  workspaceSlug,
  viewMode,
}: {
  collection: TDocumentCollectionTreeNode;
  documents: TDocumentTreeNode[];
  workspaceSlug: string;
  viewMode: ViewMode;
}) {
  const router = useAppRouter();
  const collectionDocuments = documents.filter((p) => p.collection === collection.id);
  const documentCount = collectionDocuments.length;

  if (viewMode === "list") {
    // Clean list row matching design system
    return (
      <div className="group flex items-center gap-2.5 px-page-x py-2 min-h-11 hover:bg-layer-transparent-hover cursor-pointer rounded-sm transition-colors">
        <span className="text-lg">📁</span>
        <span className="flex-1 text-13 font-medium text-primary truncate">{collection.name}</span>
        <span className="text-11 text-placeholder">
          {documentCount} {documentCount === 1 ? "document" : "documents"}
        </span>
      </div>
    );
  }

  // Grid view - card matching design system
  return (
    <div className="group flex flex-col p-4 bg-surface-1 rounded-lg cursor-pointer transition-all duration-200 hover:bg-layer-transparent-hover border border-subtle">
      {/* Folder icon */}
      <div className="mb-3">
        <span className="text-[42px] leading-none">📁</span>
      </div>

      {/* Title and document count */}
      <h3 className="text-13 font-medium text-primary truncate mb-1">{collection.name}</h3>
      <p className="text-11 text-tertiary mb-3">
        {documentCount} {documentCount === 1 ? "document" : "documents"}
      </p>

      {/* Document previews */}
      <div className="space-y-0.5">
        {collectionDocuments.slice(0, 3).map((doc) => (
          <div
            role="button"
            tabIndex={0}
            key={doc.id}
            className="flex items-center gap-2 px-2 py-1 text-11 text-tertiary hover:bg-layer-transparent-hover rounded-sm cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${workspaceSlug}/documents/${doc.id}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                router.push(`/${workspaceSlug}/documents/${doc.id}`);
              }
            }}
          >
            {doc.logo_props?.in_use ? (
              <Logo logo={doc.logo_props} size={14} type="lucide" />
            ) : (
              <span className="text-sm text-placeholder">📄</span>
            )}
            <span className="truncate">{doc.name || "Untitled"}</span>
          </div>
        ))}
        {documentCount > 3 && <div className="text-11 text-placeholder px-2 py-1">+{documentCount - 3} more</div>}
      </div>
    </div>
  );
});

export const DocumentListView = memo(function DocumentListView({ workspaceSlug }: DocumentListViewProps) {
  const { viewMode } = useDocumentViewStore();
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);

  // Queries
  const { data: documents, isLoading: documentsLoading } = useDocuments(workspaceSlug);
  const { data: collections, isLoading: collectionsLoading } = useDocumentCollections(workspaceSlug);

  // Build tree structures
  const documentTree = useMemo(() => buildDocumentTree(documents), [documents]);
  const collectionTree = useMemo(() => buildDocumentCollectionTree(collections), [collections]);

  // Filter root documents (no collection)
  const rootDocuments = useMemo(() => documentTree.filter((p) => !p.collection), [documentTree]);

  const isLoading = documentsLoading || collectionsLoading;
  const isEmpty = rootDocuments.length === 0 && collectionTree.length === 0;

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
          <div className="space-y-8">
            {/* Collections */}
            {collectionTree.length > 0 && (
              <div>
                <h2 className="text-11 font-semibold text-placeholder uppercase tracking-wider mb-3">Collections</h2>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                      : "space-y-0.5"
                  )}
                >
                  {collectionTree.map((collection) => (
                    <DocumentCollectionCard
                      key={collection.id}
                      collection={collection}
                      documents={documentTree}
                      workspaceSlug={workspaceSlug}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {rootDocuments.length > 0 && (
              <div>
                <h2 className="text-11 font-semibold text-placeholder uppercase tracking-wider mb-3">Documents</h2>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                      : "space-y-0.5"
                  )}
                >
                  {rootDocuments.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} workspaceSlug={workspaceSlug} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for empty state action */}
      <CreateDocumentModal
        workspaceSlug={workspaceSlug}
        isOpen={isCreateDocumentModalOpen}
        onClose={() => setIsCreateDocumentModalOpen(false)}
      />
    </div>
  );
});

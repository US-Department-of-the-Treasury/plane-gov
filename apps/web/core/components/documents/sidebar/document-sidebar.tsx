"use client";

import { memo, useMemo, useState } from "react";
import { Plus, Search, ChevronRight, File, FolderClosed, Lock } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
// plane imports
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// components
import { Tooltip } from "@plane/ui";
import { DocumentEmptyState, DocumentSidebarSkeleton } from "@/components/documents/empty-states";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useDocuments, useDocumentCollections, buildDocumentTree, buildDocumentCollectionTree } from "@/store/queries";
import type { TDocumentTreeNode, TDocumentCollectionTreeNode } from "@/store/queries";

interface DocumentSidebarProps {
  workspaceSlug: string;
  activeDocumentId?: string;
  onCreateDocument?: () => void;
}

const DocumentItem = memo(function DocumentItem({
  document,
  workspaceSlug,
  activeDocumentId,
  depth = 0,
}: {
  document: TDocumentTreeNode;
  workspaceSlug: string;
  activeDocumentId?: string;
  depth?: number;
}) {
  const router = useAppRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = activeDocumentId === document.id;
  const hasChildren = document.children.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-custom-background-80",
            {
              "bg-custom-primary-100/10 text-custom-primary-100": isActive,
            }
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => router.push(`/${workspaceSlug}/documents/${document.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/${workspaceSlug}/documents/${document.id}`);
            }
          }}
        >
          {hasChildren && (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex-shrink-0 p-0.5 rounded hover:bg-custom-background-90"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronRight
                  className={cn("size-3.5 transition-transform", {
                    "rotate-90": isOpen,
                  })}
                />
              </button>
            </CollapsibleTrigger>
          )}
          {!hasChildren && <div className="w-4" />}
          <File className="size-4 flex-shrink-0 text-custom-text-300" />
          <span className="flex-1 truncate">{document.name || "Untitled"}</span>
          {document.is_locked && <Lock className="size-3 flex-shrink-0 text-custom-text-400" />}
        </div>
        {hasChildren && (
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            {document.children.map((child) => (
              <DocumentItem
                key={child.id}
                document={child}
                workspaceSlug={workspaceSlug}
                activeDocumentId={activeDocumentId}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
});

const DocumentCollectionItem = memo(function DocumentCollectionItem({
  collection,
  documents,
  workspaceSlug,
  activeDocumentId,
  depth = 0,
}: {
  collection: TDocumentCollectionTreeNode;
  documents: TDocumentTreeNode[];
  workspaceSlug: string;
  activeDocumentId?: string;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const collectionDocuments = documents.filter((p) => p.collection === collection.id);
  const hasContent = collection.children.length > 0 || collectionDocuments.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "group w-full flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-custom-background-80"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform flex-shrink-0", {
                "rotate-90": isOpen,
              })}
            />
            <FolderClosed className="size-4 flex-shrink-0 text-custom-text-300" />
            <span className="flex-1 truncate text-left font-medium">{collection.name}</span>
          </button>
        </CollapsibleTrigger>
        {hasContent && (
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            {collection.children.map((child) => (
              <DocumentCollectionItem
                key={child.id}
                collection={child}
                documents={documents}
                workspaceSlug={workspaceSlug}
                activeDocumentId={activeDocumentId}
                depth={depth + 1}
              />
            ))}
            {collectionDocuments.map((document) => (
              <DocumentItem
                key={document.id}
                document={document}
                workspaceSlug={workspaceSlug}
                activeDocumentId={activeDocumentId}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
});

export const DocumentSidebar = memo(function DocumentSidebar({
  workspaceSlug,
  activeDocumentId,
  onCreateDocument,
}: DocumentSidebarProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: pages, isLoading: pagesLoading } = useDocuments(workspaceSlug);
  const { data: collections, isLoading: collectionsLoading } = useDocumentCollections(workspaceSlug);

  // Build tree structures
  const pageTree = useMemo(() => buildDocumentTree(pages), [pages]);
  const collectionTree = useMemo(() => buildDocumentCollectionTree(collections), [collections]);

  // Filter pages without collection (root pages)
  const rootDocuments = useMemo(() => pageTree.filter((p) => !p.collection), [pageTree]);

  // Filter by search
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return rootDocuments;
    const query = searchQuery.toLowerCase();
    return rootDocuments.filter((p) => p.name.toLowerCase().includes(query));
  }, [rootDocuments, searchQuery]);

  const isLoading = pagesLoading || collectionsLoading;

  return (
    <div className="flex flex-col h-full bg-custom-sidebar-background-100 border-r border-custom-border-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
        <h2 className="text-base font-semibold">{t("documents") || "Documents"}</h2>
        <div className="flex items-center gap-1">
          <Tooltip tooltipContent="Create document">
            <button type="button" className="p-1.5 rounded hover:bg-custom-background-80" onClick={onCreateDocument}>
              <Plus className="size-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-custom-background-80">
          <Search className="size-4 text-custom-text-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-custom-text-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <DocumentSidebarSkeleton />
        ) : (
          <>
            {/* Collections */}
            {collectionTree.map((collection) => (
              <DocumentCollectionItem
                key={collection.id}
                collection={collection}
                documents={pageTree}
                workspaceSlug={workspaceSlug}
                activeDocumentId={activeDocumentId}
              />
            ))}

            {/* Root documents (no collection) */}
            {filteredDocuments.length > 0 && (
              <div className="mt-2">
                {collectionTree.length > 0 && (
                  <div className="px-2 py-1 text-xs font-medium text-custom-text-400 uppercase">Documents</div>
                )}
                {filteredDocuments.map((document) => (
                  <DocumentItem
                    key={document.id}
                    document={document}
                    workspaceSlug={workspaceSlug}
                    activeDocumentId={activeDocumentId}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredDocuments.length === 0 && collectionTree.length === 0 && (
              <DocumentEmptyState
                type={searchQuery ? "no-search-results" : "no-documents"}
                searchQuery={searchQuery}
                onAction={searchQuery ? undefined : onCreateDocument}
                actionLabel="Create your first document"
                className="py-8"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

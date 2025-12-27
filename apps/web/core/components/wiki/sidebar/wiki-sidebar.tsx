"use client";

import { memo, useMemo, useState } from "react";
import { Plus, Search, ChevronRight, File, FolderClosed, Lock } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
// plane imports
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// components
import { Tooltip } from "@plane/ui";
import { WikiEmptyState, WikiSidebarSkeleton } from "@/components/wiki/empty-states";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useWikiPages, useWikiCollections, buildWikiPageTree, buildWikiCollectionTree } from "@/store/queries";
import type { TWikiPageTreeNode, TWikiCollectionTreeNode } from "@/store/queries";

interface WikiSidebarProps {
  workspaceSlug: string;
  activePageId?: string;
  onCreatePage?: () => void;
}

const WikiPageItem = memo(function WikiPageItem({
  page,
  workspaceSlug,
  activePageId,
  depth = 0,
}: {
  page: TWikiPageTreeNode;
  workspaceSlug: string;
  activePageId?: string;
  depth?: number;
}) {
  const router = useAppRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = activePageId === page.id;
  const hasChildren = page.children.length > 0;

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
          onClick={() => router.push(`/${workspaceSlug}/wiki/${page.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/${workspaceSlug}/wiki/${page.id}`);
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
          <span className="flex-1 truncate">{page.name || "Untitled"}</span>
          {page.is_locked && <Lock className="size-3 flex-shrink-0 text-custom-text-400" />}
        </div>
        {hasChildren && (
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            {page.children.map((child) => (
              <WikiPageItem
                key={child.id}
                page={child}
                workspaceSlug={workspaceSlug}
                activePageId={activePageId}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
});

const WikiCollectionItem = memo(function WikiCollectionItem({
  collection,
  pages,
  workspaceSlug,
  activePageId,
  depth = 0,
}: {
  collection: TWikiCollectionTreeNode;
  pages: TWikiPageTreeNode[];
  workspaceSlug: string;
  activePageId?: string;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const collectionPages = pages.filter((p) => p.collection === collection.id);
  const hasContent = collection.children.length > 0 || collectionPages.length > 0;

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
              <WikiCollectionItem
                key={child.id}
                collection={child}
                pages={pages}
                workspaceSlug={workspaceSlug}
                activePageId={activePageId}
                depth={depth + 1}
              />
            ))}
            {collectionPages.map((page) => (
              <WikiPageItem
                key={page.id}
                page={page}
                workspaceSlug={workspaceSlug}
                activePageId={activePageId}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
});

export const WikiSidebar = memo(function WikiSidebar({ workspaceSlug, activePageId, onCreatePage }: WikiSidebarProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: pages, isLoading: pagesLoading } = useWikiPages(workspaceSlug);
  const { data: collections, isLoading: collectionsLoading } = useWikiCollections(workspaceSlug);

  // Build tree structures
  const pageTree = useMemo(() => buildWikiPageTree(pages), [pages]);
  const collectionTree = useMemo(() => buildWikiCollectionTree(collections), [collections]);

  // Filter pages without collection (root pages)
  const rootPages = useMemo(() => pageTree.filter((p) => !p.collection), [pageTree]);

  // Filter by search
  const filteredPages = useMemo(() => {
    if (!searchQuery) return rootPages;
    const query = searchQuery.toLowerCase();
    return rootPages.filter((p) => p.name.toLowerCase().includes(query));
  }, [rootPages, searchQuery]);

  const isLoading = pagesLoading || collectionsLoading;

  return (
    <div className="flex flex-col h-full bg-custom-sidebar-background-100 border-r border-custom-border-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
        <h2 className="text-base font-semibold">{t("wiki") || "Wiki"}</h2>
        <div className="flex items-center gap-1">
          <Tooltip tooltipContent="Create page">
            <button type="button" className="p-1.5 rounded hover:bg-custom-background-80" onClick={onCreatePage}>
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
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-custom-text-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <WikiSidebarSkeleton />
        ) : (
          <>
            {/* Collections */}
            {collectionTree.map((collection) => (
              <WikiCollectionItem
                key={collection.id}
                collection={collection}
                pages={pageTree}
                workspaceSlug={workspaceSlug}
                activePageId={activePageId}
              />
            ))}

            {/* Root pages (no collection) */}
            {filteredPages.length > 0 && (
              <div className="mt-2">
                {collectionTree.length > 0 && (
                  <div className="px-2 py-1 text-xs font-medium text-custom-text-400 uppercase">Wikis</div>
                )}
                {filteredPages.map((page) => (
                  <WikiPageItem key={page.id} page={page} workspaceSlug={workspaceSlug} activePageId={activePageId} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredPages.length === 0 && collectionTree.length === 0 && (
              <WikiEmptyState
                type={searchQuery ? "no-search-results" : "no-pages"}
                searchQuery={searchQuery}
                onAction={searchQuery ? undefined : onCreatePage}
                actionLabel="Create your first wiki"
                className="py-8"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

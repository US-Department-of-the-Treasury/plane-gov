"use client";

import { memo, useMemo, useState } from "react";
import { FileText, FolderClosed, Search, Grid, List, Clock, MoreHorizontal } from "lucide-react";
// plane imports
import { Logo } from "@plane/propel/emoji-icon-picker";
import { cn } from "@plane/utils";
import { Tooltip } from "@plane/ui";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useWikiPages, useWikiCollections, buildWikiPageTree, buildWikiCollectionTree } from "@/store/queries";
import type { TWikiPageTreeNode, TWikiCollectionTreeNode } from "@/store/queries";
// components
import { CreateWikiPageModal, CreateWikiCollectionModal } from "@/components/wiki/modals";
import { WikiEmptyState, WikiPageListSkeleton } from "@/components/wiki/empty-states";

interface WikiListViewProps {
  workspaceSlug: string;
}

type ViewMode = "grid" | "list";

const WikiPageCard = memo(function WikiPageCard({
  page,
  workspaceSlug,
  viewMode,
}: {
  page: TWikiPageTreeNode;
  workspaceSlug: string;
  viewMode: ViewMode;
}) {
  const router = useAppRouter();
  const hasIcon = page.logo_props?.in_use;

  const handleClick = () => {
    router.push(`/${workspaceSlug}/wiki/${page.id}`);
  };

  if (viewMode === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        className="group flex items-center gap-3 px-4 py-2.5 hover:bg-custom-background-80 cursor-pointer border-b border-custom-border-100 transition-colors"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
      >
        {/* Page icon */}
        {hasIcon ? (
          <div className="flex-shrink-0">
            <Logo logo={page.logo_props} size={20} type="lucide" />
          </div>
        ) : (
          <FileText className="size-5 text-custom-text-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm text-custom-text-200 truncate">{page.name || "Untitled"}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-custom-text-400">
          <span>{new Date(page.updated_at).toLocaleDateString()}</span>
        </div>
        <button
          type="button"
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-custom-background-90"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4 text-custom-text-400" />
        </button>
      </div>
    );
  }

  // Grid view - Notion-style card with hover lift
  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex flex-col p-4 bg-custom-background-100 border border-custom-border-100 rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-custom-border-200 hover:-translate-y-0.5"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* Icon and title */}
      <div className="flex items-start gap-3 mb-3">
        {hasIcon ? (
          <div className="flex-shrink-0 p-2 bg-custom-background-80 rounded-lg">
            <Logo logo={page.logo_props} size={24} type="lucide" />
          </div>
        ) : (
          <div className="flex-shrink-0 p-2 bg-custom-background-80 rounded-lg">
            <FileText className="size-6 text-custom-text-400" />
          </div>
        )}
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-sm font-medium text-custom-text-100 truncate">{page.name || "Untitled"}</h3>
        </div>
        {/* Hover action */}
        <button
          type="button"
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-custom-background-80"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4 text-custom-text-400" />
        </button>
      </div>

      {/* Description preview */}
      {page.description_stripped && (
        <p className="text-xs text-custom-text-400 line-clamp-2 mb-3">{page.description_stripped}</p>
      )}

      {/* Footer with date */}
      <div className="flex items-center gap-2 text-xs text-custom-text-400 mt-auto pt-3 border-t border-custom-border-100">
        <Clock className="size-3" />
        <span>Edited {new Date(page.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
});

const WikiCollectionCard = memo(function WikiCollectionCard({
  collection,
  pages,
  workspaceSlug,
  viewMode,
}: {
  collection: TWikiCollectionTreeNode;
  pages: TWikiPageTreeNode[];
  workspaceSlug: string;
  viewMode: ViewMode;
}) {
  const router = useAppRouter();
  const collectionPages = pages.filter((p) => p.collection === collection.id);
  const pageCount = collectionPages.length;

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-custom-background-80 cursor-pointer border-b border-custom-border-100 transition-colors">
        <FolderClosed className="size-5 text-custom-text-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-custom-text-200 truncate">{collection.name}</h3>
        </div>
        <div className="text-xs text-custom-text-400">
          {pageCount} {pageCount === 1 ? "page" : "pages"}
        </div>
        <button
          type="button"
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-custom-background-90"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4 text-custom-text-400" />
        </button>
      </div>
    );
  }

  // Grid view - Notion-style collection card
  return (
    <div className="group flex flex-col p-4 bg-custom-background-100 border border-custom-border-100 rounded-xl cursor-pointer transition-all hover:shadow-md hover:border-custom-border-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-custom-background-80 rounded-lg">
          <FolderClosed className="size-6 text-custom-text-400" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-sm font-medium text-custom-text-100 truncate">{collection.name}</h3>
          <p className="text-xs text-custom-text-400 mt-0.5">
            {pageCount} {pageCount === 1 ? "page" : "pages"}
          </p>
        </div>
        <button
          type="button"
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-custom-background-80"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4 text-custom-text-400" />
        </button>
      </div>
      {/* Page previews */}
      {collectionPages.slice(0, 3).map((page) => (
        <div
          role="button"
          tabIndex={0}
          key={page.id}
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-custom-text-300 hover:bg-custom-background-80 rounded-md cursor-pointer transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/${workspaceSlug}/wiki/${page.id}`);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              router.push(`/${workspaceSlug}/wiki/${page.id}`);
            }
          }}
        >
          {page.logo_props?.in_use ? (
            <Logo logo={page.logo_props} size={14} type="lucide" />
          ) : (
            <FileText className="size-3.5 text-custom-text-400" />
          )}
          <span className="truncate">{page.name || "Untitled"}</span>
        </div>
      ))}
      {pageCount > 3 && <div className="text-xs text-custom-text-400 px-2 py-1 mt-1">+{pageCount - 3} more</div>}
    </div>
  );
});

export const WikiListView = memo(function WikiListView({ workspaceSlug }: WikiListViewProps) {
  const _router = useAppRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isCreatePageModalOpen, setIsCreatePageModalOpen] = useState(false);
  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] = useState(false);

  // Queries
  const { data: pages, isLoading: pagesLoading } = useWikiPages(workspaceSlug);
  const { data: collections, isLoading: collectionsLoading } = useWikiCollections(workspaceSlug);

  // Build tree structures
  const pageTree = useMemo(() => buildWikiPageTree(pages), [pages]);
  const collectionTree = useMemo(() => buildWikiCollectionTree(collections), [collections]);

  // Filter root pages (no collection)
  const rootPages = useMemo(() => pageTree.filter((p) => !p.collection), [pageTree]);

  // Filter by search
  const filteredPages = useMemo(() => {
    if (!searchQuery) return rootPages;
    const query = searchQuery.toLowerCase();
    return rootPages.filter(
      (p) => p.name.toLowerCase().includes(query) || p.description_stripped?.toLowerCase().includes(query)
    );
  }, [rootPages, searchQuery]);

  const filteredCollections = useMemo(() => {
    if (!searchQuery) return collectionTree;
    const query = searchQuery.toLowerCase();
    return collectionTree.filter((c) => c.name.toLowerCase().includes(query));
  }, [collectionTree, searchQuery]);

  const isLoading = pagesLoading || collectionsLoading;
  const isEmpty = filteredPages.length === 0 && filteredCollections.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-custom-border-200">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-custom-background-80 rounded-md max-w-md flex-1">
            <Search className="size-4 text-custom-text-400" />
            <input
              type="text"
              placeholder="Search wiki pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-custom-text-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border border-custom-border-200 rounded-md">
            <Tooltip tooltipContent="Grid view">
              <button
                type="button"
                className={cn(
                  "p-1.5 rounded-l-md",
                  viewMode === "grid" ? "bg-custom-background-80" : "hover:bg-custom-background-80"
                )}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="size-4" />
              </button>
            </Tooltip>
            <Tooltip tooltipContent="List view">
              <button
                type="button"
                className={cn(
                  "p-1.5 rounded-r-md",
                  viewMode === "list" ? "bg-custom-background-80" : "hover:bg-custom-background-80"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="size-4" />
              </button>
            </Tooltip>
          </div>

          {/* Create collection button */}
          <Tooltip tooltipContent="New collection">
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-custom-border-200 rounded-md hover:bg-custom-background-80"
              onClick={() => setIsCreateCollectionModalOpen(true)}
            >
              <FolderClosed className="size-4" />
              <span>Collection</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <WikiPageListSkeleton count={6} />
        ) : isEmpty ? (
          <WikiEmptyState
            type={searchQuery ? "no-search-results" : "no-pages"}
            searchQuery={searchQuery}
            onAction={searchQuery ? undefined : () => setIsCreatePageModalOpen(true)}
            actionLabel="Create your first page"
            className="h-64"
          />
        ) : (
          <div className="space-y-8">
            {/* Collections */}
            {filteredCollections.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-custom-text-300 uppercase tracking-wide mb-4">Collections</h2>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "border border-custom-border-200 rounded-md overflow-hidden"
                  )}
                >
                  {filteredCollections.map((collection) => (
                    <WikiCollectionCard
                      key={collection.id}
                      collection={collection}
                      pages={pageTree}
                      workspaceSlug={workspaceSlug}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pages */}
            {filteredPages.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-custom-text-300 uppercase tracking-wide mb-4">Pages</h2>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "border border-custom-border-200 rounded-md overflow-hidden"
                  )}
                >
                  {filteredPages.map((page) => (
                    <WikiPageCard key={page.id} page={page} workspaceSlug={workspaceSlug} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateWikiPageModal
        workspaceSlug={workspaceSlug}
        isOpen={isCreatePageModalOpen}
        onClose={() => setIsCreatePageModalOpen(false)}
      />
      <CreateWikiCollectionModal
        workspaceSlug={workspaceSlug}
        isOpen={isCreateCollectionModalOpen}
        onClose={() => setIsCreateCollectionModalOpen(false)}
      />
    </div>
  );
});

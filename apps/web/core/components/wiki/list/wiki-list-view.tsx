"use client";

import { memo, useMemo, useState } from "react";
import { FolderClosed, Search, Grid, List } from "lucide-react";
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
    // Notion-style clean list row
    return (
      <div
        role="button"
        tabIndex={0}
        className="group flex items-center gap-3 px-3 py-2 hover:bg-[#f7f7f5] dark:hover:bg-[#2f2f2f] cursor-pointer rounded-md transition-colors"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
      >
        {/* Large emoji/icon - Notion style */}
        <div className="flex-shrink-0 size-6 flex items-center justify-center">
          {hasIcon ? (
            <Logo logo={page.logo_props} size={22} type="lucide" />
          ) : (
            <span className="text-lg opacity-40">📄</span>
          )}
        </div>
        <span className="flex-1 text-[15px] text-[#37352f] dark:text-[#ffffffcf] truncate">
          {page.name || "Untitled"}
        </span>
        {/* Subtle date on hover */}
        <span className="text-xs text-[#37352f52] dark:text-[#ffffff52] opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(page.updated_at).toLocaleDateString()}
        </span>
      </div>
    );
  }

  // Grid view - Notion-style minimal card
  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex flex-col p-4 bg-white dark:bg-[#202020] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f7f7f5] dark:hover:bg-[#2f2f2f] border border-transparent hover:border-[#e0e0e0] dark:hover:border-[#3a3a3a]"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      {/* Large icon at top - Notion style */}
      <div className="mb-3">
        {hasIcon ? (
          <Logo logo={page.logo_props} size={42} type="lucide" />
        ) : (
          <span className="text-[42px] leading-none opacity-30">📄</span>
        )}
      </div>

      {/* Title - Notion typography */}
      <h3 className="text-[15px] font-medium text-[#37352f] dark:text-[#ffffffcf] line-clamp-2 mb-1">
        {page.name || "Untitled"}
      </h3>

      {/* Description preview - subtle */}
      {page.description_stripped && (
        <p className="text-[13px] text-[#37352f80] dark:text-[#ffffff80] line-clamp-2">{page.description_stripped}</p>
      )}

      {/* Minimal footer - no divider, just subtle text */}
      <div className="mt-auto pt-3">
        <span className="text-[11px] text-[#37352f52] dark:text-[#ffffff52]">
          {new Date(page.updated_at).toLocaleDateString()}
        </span>
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
    // Notion-style clean list row for collections
    return (
      <div className="group flex items-center gap-3 px-3 py-2 hover:bg-[#f7f7f5] dark:hover:bg-[#2f2f2f] cursor-pointer rounded-md transition-colors">
        <span className="text-lg">📁</span>
        <span className="flex-1 text-[15px] font-medium text-[#37352f] dark:text-[#ffffffcf] truncate">
          {collection.name}
        </span>
        <span className="text-[13px] text-[#37352f52] dark:text-[#ffffff52]">
          {pageCount} {pageCount === 1 ? "page" : "pages"}
        </span>
      </div>
    );
  }

  // Grid view - Notion-style minimal collection card
  return (
    <div className="group flex flex-col p-4 bg-white dark:bg-[#202020] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#f7f7f5] dark:hover:bg-[#2f2f2f] border border-transparent hover:border-[#e0e0e0] dark:hover:border-[#3a3a3a]">
      {/* Folder icon */}
      <div className="mb-3">
        <span className="text-[42px] leading-none">📁</span>
      </div>

      {/* Title and page count */}
      <h3 className="text-[15px] font-medium text-[#37352f] dark:text-[#ffffffcf] truncate mb-1">{collection.name}</h3>
      <p className="text-[13px] text-[#37352f80] dark:text-[#ffffff80] mb-3">
        {pageCount} {pageCount === 1 ? "page" : "pages"}
      </p>

      {/* Page previews - Notion style */}
      <div className="space-y-0.5">
        {collectionPages.slice(0, 3).map((page) => (
          <div
            role="button"
            tabIndex={0}
            key={page.id}
            className="flex items-center gap-2 px-2 py-1 text-[13px] text-[#37352f99] dark:text-[#ffffff99] hover:bg-[#37352f0d] dark:hover:bg-[#ffffff0d] rounded cursor-pointer transition-colors"
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
              <span className="text-sm opacity-50">📄</span>
            )}
            <span className="truncate">{page.name || "Untitled"}</span>
          </div>
        ))}
        {pageCount > 3 && (
          <div className="text-[11px] text-[#37352f52] dark:text-[#ffffff52] px-2 py-1">+{pageCount - 3} more</div>
        )}
      </div>
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
          <div className="space-y-10">
            {/* Collections - Notion style section */}
            {filteredCollections.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium text-[#37352f80] dark:text-[#ffffff80] uppercase tracking-wider mb-3 px-1">
                  Collections
                </h2>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                      : "space-y-0.5"
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

            {/* Pages - Notion style section */}
            {filteredPages.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium text-[#37352f80] dark:text-[#ffffff80] uppercase tracking-wider mb-3 px-1">
                  Pages
                </h2>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                      : "space-y-0.5"
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

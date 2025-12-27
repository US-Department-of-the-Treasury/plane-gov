"use client";

import { memo, useMemo, useState } from "react";
// plane imports
import { Logo } from "@plane/propel/emoji-icon-picker";
import { cn } from "@plane/utils";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useWikiPages, useWikiCollections, buildWikiPageTree, buildWikiCollectionTree } from "@/store/queries";
import type { TWikiPageTreeNode, TWikiCollectionTreeNode } from "@/store/queries";
// components
import { CreateWikiPageModal } from "@/components/wiki/modals";
import { WikiEmptyState, WikiPageListSkeleton } from "@/components/wiki/empty-states";
// store
import { useWikiViewStore } from "@/store/wiki-view.store";

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
            <Logo logo={page.logo_props} size={22} type="lucide" />
          ) : (
            <span className="text-lg text-tertiary">📄</span>
          )}
        </div>
        <span className="flex-1 text-13 text-primary truncate">{page.name || "Untitled"}</span>
        {/* Date on hover */}
        <span className="text-11 text-placeholder opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(page.updated_at).toLocaleDateString()}
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
          <Logo logo={page.logo_props} size={42} type="lucide" />
        ) : (
          <span className="text-[42px] leading-none text-tertiary">📄</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-13 font-medium text-primary line-clamp-2 mb-1">{page.name || "Untitled"}</h3>

      {/* Description preview */}
      {page.description_stripped && <p className="text-11 text-tertiary line-clamp-2">{page.description_stripped}</p>}

      {/* Footer */}
      <div className="mt-auto pt-3">
        <span className="text-11 text-placeholder">{new Date(page.updated_at).toLocaleDateString()}</span>
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
    // Clean list row matching design system
    return (
      <div className="group flex items-center gap-2.5 px-page-x py-2 min-h-11 hover:bg-layer-transparent-hover cursor-pointer rounded-sm transition-colors">
        <span className="text-lg">📁</span>
        <span className="flex-1 text-13 font-medium text-primary truncate">{collection.name}</span>
        <span className="text-11 text-placeholder">
          {pageCount} {pageCount === 1 ? "page" : "pages"}
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

      {/* Title and page count */}
      <h3 className="text-13 font-medium text-primary truncate mb-1">{collection.name}</h3>
      <p className="text-11 text-tertiary mb-3">
        {pageCount} {pageCount === 1 ? "page" : "pages"}
      </p>

      {/* Page previews */}
      <div className="space-y-0.5">
        {collectionPages.slice(0, 3).map((page) => (
          <div
            role="button"
            tabIndex={0}
            key={page.id}
            className="flex items-center gap-2 px-2 py-1 text-11 text-tertiary hover:bg-layer-transparent-hover rounded-sm cursor-pointer transition-colors"
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
              <span className="text-sm text-placeholder">📄</span>
            )}
            <span className="truncate">{page.name || "Untitled"}</span>
          </div>
        ))}
        {pageCount > 3 && <div className="text-11 text-placeholder px-2 py-1">+{pageCount - 3} more</div>}
      </div>
    </div>
  );
});

export const WikiListView = memo(function WikiListView({ workspaceSlug }: WikiListViewProps) {
  const { viewMode } = useWikiViewStore();
  const [isCreatePageModalOpen, setIsCreatePageModalOpen] = useState(false);

  // Queries
  const { data: pages, isLoading: pagesLoading } = useWikiPages(workspaceSlug);
  const { data: collections, isLoading: collectionsLoading } = useWikiCollections(workspaceSlug);

  // Build tree structures
  const pageTree = useMemo(() => buildWikiPageTree(pages), [pages]);
  const collectionTree = useMemo(() => buildWikiCollectionTree(collections), [collections]);

  // Filter root pages (no collection)
  const rootPages = useMemo(() => pageTree.filter((p) => !p.collection), [pageTree]);

  const isLoading = pagesLoading || collectionsLoading;
  const isEmpty = rootPages.length === 0 && collectionTree.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-page-x py-6">
        {isLoading ? (
          <WikiPageListSkeleton count={6} />
        ) : isEmpty ? (
          <WikiEmptyState
            type="no-pages"
            onAction={() => setIsCreatePageModalOpen(true)}
            actionLabel="Create your first page"
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
            {rootPages.length > 0 && (
              <div>
                <h2 className="text-11 font-semibold text-placeholder uppercase tracking-wider mb-3">Wikis</h2>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                      : "space-y-0.5"
                  )}
                >
                  {rootPages.map((page) => (
                    <WikiPageCard key={page.id} page={page} workspaceSlug={workspaceSlug} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for empty state action */}
      <CreateWikiPageModal
        workspaceSlug={workspaceSlug}
        isOpen={isCreatePageModalOpen}
        onClose={() => setIsCreatePageModalOpen(false)}
      />
    </div>
  );
});

"use client";

import { memo, useMemo, useState } from "react";
// plane imports
import { Logo } from "@plane/propel/emoji-icon-picker";
import { cn } from "@plane/utils";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useProjectWikiPages, buildWikiPageTree } from "@/store/queries";
import type { TWikiPageTreeNode } from "@/store/queries";
// components
import { CreateWikiPageModal } from "@/components/wiki/modals";
import { WikiEmptyState, WikiPageListSkeleton } from "@/components/wiki/empty-states";
// store
import { useWikiViewStore } from "@/store/wiki-view.store";

interface ProjectWikiListViewProps {
  workspaceSlug: string;
  projectId: string;
}

type ViewMode = "grid" | "list";

const ProjectPageCard = memo(function ProjectPageCard({
  page,
  workspaceSlug,
  projectId,
  viewMode,
}: {
  page: TWikiPageTreeNode;
  workspaceSlug: string;
  projectId: string;
  viewMode: ViewMode;
}) {
  const router = useAppRouter();
  const hasIcon = page.logo_props?.in_use;

  const handleClick = () => {
    router.push(`/${workspaceSlug}/projects/${projectId}/pages/${page.id}`);
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

export const ProjectWikiListView = memo(function ProjectWikiListView({
  workspaceSlug,
  projectId,
}: ProjectWikiListViewProps) {
  const { viewMode } = useWikiViewStore();
  const [isCreatePageModalOpen, setIsCreatePageModalOpen] = useState(false);

  // Query for project-specific wiki pages
  const { data: pages, isLoading } = useProjectWikiPages(workspaceSlug, projectId);

  // Build tree structure (filter out pages with collections for project pages)
  const pageTree = useMemo(() => {
    const tree = buildWikiPageTree(pages);
    // For project pages, we only show pages without collections
    return tree.filter((p) => !p.collection);
  }, [pages]);

  const isEmpty = pageTree.length === 0;

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
            actionLabel="Create your first wiki"
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
              {pageTree.map((page) => (
                <ProjectPageCard
                  key={page.id}
                  page={page}
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
      <CreateWikiPageModal
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        isOpen={isCreatePageModalOpen}
        onClose={() => setIsCreatePageModalOpen(false)}
      />
    </div>
  );
});

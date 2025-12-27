"use client";

import { memo, useMemo } from "react";
import { Bug, Milestone, CheckSquare, Clock } from "lucide-react";
// plane imports
import { Logo } from "@plane/propel/emoji-icon-picker";
import { cn } from "@plane/utils";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useDocuments, buildDocumentTree } from "@/store/queries";
import type { TDocumentTreeNode } from "@/store/queries";
// types
import type { TDocumentType } from "@plane/types";
// components
import { DocumentEmptyState, DocumentListSkeleton } from "@/components/documents/empty-states";
// store
import { useDocumentViewStore } from "@/store/document-view.store";

interface RecentDocumentsViewProps {
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

const RecentDocumentCard = memo(function RecentDocumentCard({
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

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (viewMode === "list") {
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
        {/* Relative time */}
        <span className="text-11 text-placeholder flex items-center gap-1">
          <Clock className="size-3" />
          {formatRelativeTime(document.updated_at)}
        </span>
      </div>
    );
  }

  // Grid view
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
      <div className="mt-auto pt-3 flex items-center gap-1 text-11 text-placeholder">
        <Clock className="size-3" />
        {formatRelativeTime(document.updated_at)}
      </div>
    </div>
  );
});

export const RecentDocumentsView = memo(function RecentDocumentsView({ workspaceSlug }: RecentDocumentsViewProps) {
  const { viewMode } = useDocumentViewStore();

  // Queries
  const { data: documents, isLoading } = useDocuments(workspaceSlug);

  // Build tree and sort by updated_at (most recent first)
  const recentDocuments = useMemo(() => {
    const tree = buildDocumentTree(documents);
    // Flatten the tree and sort by updated_at descending
    return [...tree].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [documents]);

  const isEmpty = recentDocuments.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-page-x py-6">
        {isLoading ? (
          <DocumentListSkeleton count={6} />
        ) : isEmpty ? (
          <DocumentEmptyState type="no-documents" className="h-64" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-placeholder">
              <Clock className="size-4" />
              <h2 className="text-11 font-semibold uppercase tracking-wider">Recently Updated</h2>
            </div>
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  : "space-y-0.5"
              )}
            >
              {recentDocuments.map((doc) => (
                <RecentDocumentCard key={doc.id} document={doc} workspaceSlug={workspaceSlug} viewMode={viewMode} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

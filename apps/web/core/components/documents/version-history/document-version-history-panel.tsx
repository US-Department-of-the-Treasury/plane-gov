"use client";

import { memo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { History, RefreshCw, X, ChevronRight, Clock } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { cn } from "@plane/utils";
// queries
import { useDocumentVersions, useDocumentVersionDetails, useRestoreDocumentVersion } from "@/store/queries";
// types
import type { TDocumentVersion } from "@plane/types";

interface DocumentVersionHistoryPanelProps {
  workspaceSlug: string;
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const VersionItem = memo(function VersionItem({
  version,
  isSelected,
  onSelect,
}: {
  version: TDocumentVersion;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left rounded-md transition-colors",
        isSelected ? "bg-custom-primary-100/10 border border-custom-primary-100/30" : "hover:bg-custom-background-80"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Clock className="size-4 text-custom-text-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {formatDistanceToNow(new Date(version.last_saved_at), { addSuffix: true })}
        </p>
        <p className="text-xs text-custom-text-400 mt-0.5">{new Date(version.last_saved_at).toLocaleString()}</p>
      </div>
      <ChevronRight
        className={cn("size-4 text-custom-text-400 flex-shrink-0 transition-transform", isSelected && "rotate-90")}
      />
    </button>
  );
});

const VersionPreview = memo(function VersionPreview({
  workspaceSlug,
  documentId,
  versionId,
  onRestore,
  isRestoring,
}: {
  workspaceSlug: string;
  documentId: string;
  versionId: string;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const { data: version, isLoading } = useDocumentVersionDetails(workspaceSlug, documentId, versionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-custom-primary-100" />
      </div>
    );
  }

  if (!version) {
    return <div className="flex items-center justify-center h-64 text-custom-text-400">Version not found</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
        <div>
          <p className="text-sm font-medium">{new Date(version.last_saved_at).toLocaleString()}</p>
          <p className="text-xs text-custom-text-400">
            {formatDistanceToNow(new Date(version.last_saved_at), { addSuffix: true })}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={onRestore} loading={isRestoring}>
          <RefreshCw className="size-3.5 mr-1" />
          Restore this version
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-sm max-w-none">
          {version.description_html ? (
            <div className="document-content" dangerouslySetInnerHTML={{ __html: version.description_html }} />
          ) : (
            <p className="text-custom-text-400 italic">No content in this version</p>
          )}
        </div>
      </div>
    </div>
  );
});

export const DocumentVersionHistoryPanel = memo(function DocumentVersionHistoryPanel({
  workspaceSlug,
  documentId,
  isOpen,
  onClose,
}: DocumentVersionHistoryPanelProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const {
    data: versionsData,
    isLoading: versionsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDocumentVersions(workspaceSlug, documentId);

  const restoreVersionMutation = useRestoreDocumentVersion();

  const versions = versionsData?.pages.flatMap((page) => page.results) ?? [];

  const handleRestore = () => {
    if (!selectedVersionId) return;

    restoreVersionMutation.mutate(
      {
        workspaceSlug,
        pageId: documentId,
        versionId: selectedVersionId,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} position={EModalPosition.TOP} width={EModalWidth.XXXXL}>
      <div className="flex h-[600px]">
        {/* Version list */}
        <div className="w-80 border-r border-custom-border-200 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-custom-border-200">
            <History className="size-5" />
            <h3 className="text-lg font-medium">Version history</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {versionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-custom-primary-100" />
              </div>
            ) : versions.length > 0 ? (
              <div className="space-y-1">
                {versions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isSelected={selectedVersionId === version.id}
                    onSelect={() => setSelectedVersionId(version.id)}
                  />
                ))}
                {hasNextPage && (
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="w-full py-2 text-sm text-custom-primary-100 hover:underline disabled:opacity-50"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more"}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <History className="size-12 text-custom-text-400 mb-3" />
                <p className="text-sm text-custom-text-400">No version history yet</p>
                <p className="text-xs text-custom-text-400 mt-1">Versions are created when you save changes</p>
              </div>
            )}
          </div>
        </div>

        {/* Version preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
            <h4 className="text-sm font-medium">Preview</h4>
            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-custom-background-80">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {selectedVersionId ? (
              <VersionPreview
                workspaceSlug={workspaceSlug}
                documentId={documentId}
                versionId={selectedVersionId}
                onRestore={handleRestore}
                isRestoring={restoreVersionMutation.isPending}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <History className="size-16 text-custom-text-400 mb-4" />
                <p className="text-custom-text-400">Select a version to preview</p>
                <p className="text-sm text-custom-text-400 mt-1">
                  You can compare and restore previous versions of this document
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalCore>
  );
});

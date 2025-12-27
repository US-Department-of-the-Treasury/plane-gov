"use client";

import { useParams } from "next/navigation";
// plane imports
import { cn } from "@plane/utils";
// assets
import emptyPage from "@/app/assets/empty-state/documents/name-filter-light.svg?url";
// components
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/core/page-title";
import { DocumentEditor } from "@/components/documents/editor";
import { DocumentEditorSkeleton } from "@/components/documents/empty-states";
import { DocumentPropertiesPanel } from "@/components/documents/properties";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useDocumentDetails } from "@/store/queries";
// store
import { useDocumentViewStore } from "@/store/document-view.store";

export default function DocumentDetailPage() {
  const router = useAppRouter();
  const { workspaceSlug, pageId } = useParams();

  // Store
  const { isPropertiesSidebarOpen } = useDocumentViewStore();

  // Queries
  const {
    data: page,
    error,
    isLoading,
  } = useDocumentDetails(workspaceSlug?.toString() ?? "", pageId?.toString() ?? "");

  const pageTitle = page?.name ? `Documents - ${page.name}` : "Documents";

  if (error) {
    return (
      <>
        <PageHead title="Page not found" />
        <EmptyState
          image={emptyPage}
          title="Page not found"
          description="The document you are looking for does not exist or has been deleted."
          primaryButton={{
            text: "Go to Documents",
            onClick: () => router.push(`/${workspaceSlug}/documents`),
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="flex h-full w-full">
        {/* Main content area */}
        <div
          className={cn(
            "h-full overflow-hidden transition-all duration-200",
            isPropertiesSidebarOpen ? "w-[calc(100%-320px)]" : "w-full"
          )}
        >
          {isLoading ? (
            <DocumentEditorSkeleton />
          ) : (
            <DocumentEditor
              workspaceSlug={workspaceSlug?.toString() ?? ""}
              pageId={pageId?.toString() ?? ""}
              page={page!}
            />
          )}
        </div>

        {/* Properties sidebar */}
        {isPropertiesSidebarOpen && !isLoading && page && (
          <div className="w-[320px] h-full border-l border-custom-border-200 flex-shrink-0">
            <DocumentPropertiesPanel
              workspaceSlug={workspaceSlug?.toString() ?? ""}
              pageId={pageId?.toString() ?? ""}
              page={page}
            />
          </div>
        )}
      </div>
    </>
  );
}

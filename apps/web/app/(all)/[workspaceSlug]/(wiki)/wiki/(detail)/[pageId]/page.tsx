"use client";

import { useParams } from "next/navigation";
// plane imports
import { cn } from "@plane/utils";
// assets
import emptyPage from "@/app/assets/empty-state/wiki/name-filter-light.svg?url";
// components
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/core/page-title";
import { WikiPageEditor } from "@/components/wiki/editor";
import { WikiPageEditorSkeleton } from "@/components/wiki/empty-states";
import { PagePropertiesPanel } from "@/components/wiki/properties";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useWikiPageDetails } from "@/store/queries";
// store
import { useWikiViewStore } from "@/store/wiki-view.store";

export default function WikiDetailPage() {
  const router = useAppRouter();
  const { workspaceSlug, pageId } = useParams();

  // Store
  const { isPropertiesSidebarOpen } = useWikiViewStore();

  // Queries
  const {
    data: page,
    error,
    isLoading,
  } = useWikiPageDetails(workspaceSlug?.toString() ?? "", pageId?.toString() ?? "");

  const pageTitle = page?.name ? `Wiki - ${page.name}` : "Wiki";

  if (error) {
    return (
      <>
        <PageHead title="Page not found" />
        <EmptyState
          image={emptyPage}
          title="Page not found"
          description="The wiki page you are looking for does not exist or has been deleted."
          primaryButton={{
            text: "Go to Wiki",
            onClick: () => router.push(`/${workspaceSlug}/wiki`),
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
            <WikiPageEditorSkeleton />
          ) : (
            <WikiPageEditor
              workspaceSlug={workspaceSlug?.toString() ?? ""}
              pageId={pageId?.toString() ?? ""}
              page={page!}
            />
          )}
        </div>

        {/* Properties sidebar */}
        {isPropertiesSidebarOpen && !isLoading && page && (
          <div className="w-[320px] h-full border-l border-custom-border-200 flex-shrink-0">
            <PagePropertiesPanel
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

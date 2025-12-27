"use client";

import Link from "next/link";
// plane imports
import { getButtonStyling } from "@plane/propel/button";
import { cn } from "@plane/utils";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { PageHead } from "@/components/core/page-title";
import { WikiPageEditor } from "@/components/wiki/editor";
// queries
import { useWikiPageDetails } from "@/store/queries";
import type { Route } from "./+types/page";

function PageDetailsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId, pageId } = params;

  // Query wiki page details
  const { data: page, error, isLoading } = useWikiPageDetails(workspaceSlug, pageId);

  // Loading state
  if (isLoading) {
    return (
      <div className="size-full grid place-items-center">
        <LogoSpinner />
      </div>
    );
  }

  // Error or page not found
  if (error || !page) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <h3 className="text-16 font-semibold text-center">Page not found</h3>
        <p className="text-13 text-secondary text-center mt-3">
          The page you are trying to access doesn{"'"}t exist or you don{"'"}t have permission to view it.
        </p>
        <Link
          href={`/${workspaceSlug}/projects/${projectId}/pages`}
          className={cn(getButtonStyling("secondary", "base"), "mt-5")}
        >
          View other wikis
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHead title={page.name} />
      <div className="flex h-full w-full">
        <div className="h-full w-full overflow-hidden">
          <WikiPageEditor workspaceSlug={workspaceSlug} pageId={pageId} page={page} />
        </div>
      </div>
    </>
  );
}

export default PageDetailsPage;

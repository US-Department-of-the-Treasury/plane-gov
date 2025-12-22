import { useEffect } from "react";
import { Outlet } from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { PoweredBy } from "@/components/common/powered-by";
import { SomethingWentWrongError } from "@/components/issues/issue-layouts/error";
import { IssuesNavbarRoot } from "@/components/issues/navbar";
// hooks
import { PageNotFound } from "@/components/ui/not-found";
// store
import { usePublishSettings } from "@/store/queries";
import { useIssueFiltersStore } from "@/store/issue-filters.store";
import type { Route } from "./+types/layout";

const DEFAULT_TITLE = "Plane";
const DEFAULT_DESCRIPTION = "Made with Plane, an AI-powered work management platform with publishing capabilities.";

interface IssueMetadata {
  name?: string;
  description?: string;
  cover_image?: string;
}

// Loader function runs on the server and fetches metadata
export async function loader({ params }: Route.LoaderArgs) {
  const { anchor } = params;

  // Validate anchor before using in request (only allow alphanumeric, -, _)
  const ANCHOR_REGEX = /^[a-zA-Z0-9_-]+$/;
  if (!ANCHOR_REGEX.test(anchor)) {
    return { metadata: null };
  }

  try {
    const response = await fetch(`${process.env.VITE_API_BASE_URL}/api/public/anchor/${anchor}/meta/`);

    if (!response.ok) {
      return { metadata: null };
    }

    const metadata: IssueMetadata = await response.json();
    return { metadata };
  } catch (error) {
    console.error("Error fetching issue metadata:", error);
    return { metadata: null };
  }
}

// Meta function uses the loader data to generate metadata
export function meta({ loaderData }: Route.MetaArgs) {
  const metadata = loaderData?.metadata;

  const title = metadata?.name || DEFAULT_TITLE;
  const description = metadata?.description || DEFAULT_DESCRIPTION;
  const coverImage = metadata?.cover_image;

  const metaTags = [
    { title },
    { name: "description", content: description },
    // OpenGraph metadata
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    // Twitter metadata
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];

  // Add images if cover image exists
  if (coverImage) {
    metaTags.push(
      { property: "og:image", content: coverImage },
      { property: "og:image:width", content: "800" },
      { property: "og:image:height", content: "600" },
      { property: "og:image:alt", content: title },
      { name: "twitter:image", content: coverImage }
    );
  }

  return metaTags;
}

// Prevent loader from re-running on anchor param changes
export function shouldRevalidate({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) {
  return currentParams.anchor !== nextParams.anchor;
}

export default function IssuesLayout(props: Route.ComponentProps) {
  const { anchor } = props.params;
  // store hooks
  const { data: publishSettings, error, isLoading } = usePublishSettings(anchor);
  const updateLayoutOptions = useIssueFiltersStore((state) => state.updateLayoutOptions);

  // Update layout options when publish settings load
  useEffect(() => {
    if (publishSettings?.view_props) {
      updateLayoutOptions({
        list: !!publishSettings.view_props.list,
        kanban: !!publishSettings.view_props.kanban,
        calendar: !!publishSettings.view_props.calendar,
        gantt: !!publishSettings.view_props.gantt,
        spreadsheet: !!publishSettings.view_props.spreadsheet,
      });
    }
  }, [publishSettings, updateLayoutOptions]);

  if (isLoading || (!publishSettings && !error)) {
    return (
      <div className="bg-surface-1 flex items-center justify-center h-screen w-full">
        <LogoSpinner />
      </div>
    );
  }

  if ((error as any)?.status === 404) return <PageNotFound />;

  if (error) return <SomethingWentWrongError />;

  return (
    <>
      <div className="relative flex h-screen min-h-[500px] w-screen flex-col overflow-hidden">
        <div className="relative flex h-[60px] shrink-0 select-none items-center border-b border-subtle-1 bg-surface-1">
          <IssuesNavbarRoot publishSettings={publishSettings} />
        </div>
        <div className="relative size-full bg-surface-2 overflow-hidden">
          <Outlet />
        </div>
      </div>
      <PoweredBy />
    </>
  );
}

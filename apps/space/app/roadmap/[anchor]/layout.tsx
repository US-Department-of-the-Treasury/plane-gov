/* eslint-disable react-refresh/only-export-components */
// React Router v7 layouts export both server functions (loader, meta) and components

import { observer } from "mobx-react";
import { Outlet } from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import useSWR from "swr";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { PoweredBy } from "@/components/common/powered-by";
import { SomethingWentWrongError } from "@/components/issues/issue-layouts/error";
// hooks
import { PageNotFound } from "@/components/ui/not-found";
import { usePublish, usePublishList } from "@/hooks/store/publish";
import type { Route } from "./+types/layout";

const DEFAULT_TITLE = "Product Roadmap";
const DEFAULT_DESCRIPTION = "View our product roadmap - see what we're working on and vote for features you want.";

interface RoadmapMetadata {
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

    const metadata = (await response.json()) as RoadmapMetadata;
    return { metadata };
  } catch (error) {
    console.error("Error fetching roadmap metadata:", error);
    return { metadata: null };
  }
}

// Meta function uses the loader data to generate metadata
export function meta({ loaderData }: Route.MetaArgs) {
  const metadata = loaderData?.metadata;

  const title = metadata?.name ? `${metadata.name} - Roadmap` : DEFAULT_TITLE;
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

function RoadmapLayout(props: Route.ComponentProps): React.ReactNode {
  const { anchor } = props.params as { anchor: string };
  // store hooks
  const { fetchPublishSettings } = usePublishList();
  const publishSettings = usePublish(anchor);
  // fetch publish settings
  const { error } = useSWR<unknown, { status?: number }>(
    anchor ? `PUBLISH_SETTINGS_${anchor}` : null,
    anchor ? () => fetchPublishSettings(anchor) : null
  );

  if (!publishSettings && !error) {
    return (
      <div className="bg-surface-1 flex items-center justify-center h-screen w-full">
        <LogoSpinner />
      </div>
    );
  }

  if (error?.status === 404) return <PageNotFound />;

  // Check if roadmap view is enabled for this project
  if (publishSettings && !publishSettings.is_roadmap_view) {
    return <PageNotFound />;
  }

  if (error) return <SomethingWentWrongError />;

  return (
    <>
      <div className="relative flex h-screen min-h-[500px] w-screen flex-col overflow-hidden">
        <Outlet context={{ publishSettings }} />
      </div>
      <PoweredBy />
    </>
  );
}

export default observer(RoadmapLayout);

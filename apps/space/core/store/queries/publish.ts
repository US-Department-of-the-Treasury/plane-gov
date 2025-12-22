"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SitesProjectPublishService } from "@plane/services";
import type { TProjectPublishSettings } from "@plane/types";
import { queryKeys } from "./query-keys";

const publishService = new SitesProjectPublishService();

/**
 * Hook to fetch publish settings by anchor.
 * Replaces MobX PublishStore.fetchPublishSettings.
 */
export function usePublishSettings(anchor: string) {
  const query = useQuery({
    queryKey: queryKeys.publish.settings(anchor),
    queryFn: () => publishService.retrieveSettingsByAnchor(anchor),
    enabled: !!anchor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });

  // Computed values that match the old MobX store interface
  const computed = useMemo(() => {
    const settings = query.data as TProjectPublishSettings | undefined;
    return {
      canComment: !!settings?.is_comments_enabled,
      canReact: !!settings?.is_reactions_enabled,
      canVote: !!settings?.is_votes_enabled,
      workspaceSlug: settings?.workspace_detail?.slug,
      project_details: settings?.project_details,
      workspace: settings?.workspace,
    };
  }, [query.data]);

  return {
    ...query,
    ...computed,
  };
}

"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SitesLabelService } from "@plane/services";
import type { IIssueLabel } from "@plane/types";
import { queryKeys } from "./query-keys";

const labelService = new SitesLabelService();

/**
 * Hook to fetch labels for a published project.
 * Replaces MobX LabelStore.fetchLabels.
 */
export function useLabels(anchor: string) {
  const query = useQuery({
    queryKey: queryKeys.labels.all(anchor),
    queryFn: () => labelService.list(anchor),
    enabled: !!anchor,
    staleTime: 5 * 60 * 1000, // 5 minutes - labels rarely change
    gcTime: 30 * 60 * 1000,
  });

  const getLabelsByIds = useCallback(
    (labelIds: string[]): IIssueLabel[] => {
      if (!query.data || !labelIds?.length) return [];
      return query.data.filter((label) => labelIds.includes(label.id));
    },
    [query.data]
  );

  return {
    ...query,
    getLabelsByIds,
  };
}

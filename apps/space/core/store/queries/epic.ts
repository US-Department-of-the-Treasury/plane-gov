"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SitesEpicService } from "@plane/services";
import { queryKeys } from "./query-keys";

const epicService = new SitesEpicService();

type EpicData = {
  id: string;
  name: string;
};

/**
 * Hook to fetch epics for a published project.
 * Replaces MobX EpicStore.fetchEpics.
 */
export function useEpics(anchor: string) {
  const query = useQuery({
    queryKey: queryKeys.epics.all(anchor),
    queryFn: () => epicService.list(anchor),
    enabled: !!anchor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });

  const getEpicsByIds = useCallback(
    (epicIds: string[]): EpicData[] => {
      if (!query.data || !epicIds?.length) return [];
      return query.data.filter((epic: EpicData) => epicIds.includes(epic.id));
    },
    [query.data]
  );

  return {
    ...query,
    getEpicsByIds,
  };
}

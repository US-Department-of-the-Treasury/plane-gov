"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SitesSprintService } from "@plane/services";
import { queryKeys } from "./query-keys";

const sprintService = new SitesSprintService();

type SprintData = {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
};

/**
 * Hook to fetch sprints for a published project.
 * Replaces MobX SprintStore.fetchSprints.
 */
export function useSprints(anchor: string) {
  const query = useQuery({
    queryKey: queryKeys.sprints.all(anchor),
    queryFn: () => sprintService.list(anchor),
    enabled: !!anchor,
    staleTime: 2 * 60 * 1000, // 2 minutes - sprints may change more often
    gcTime: 30 * 60 * 1000,
  });

  const getSprintById = useCallback(
    (sprintId: string | undefined): SprintData | undefined => {
      if (!sprintId || !query.data) return undefined;
      return query.data.find((sprint: SprintData) => sprint.id === sprintId);
    },
    [query.data]
  );

  return {
    ...query,
    getSprintById,
  };
}

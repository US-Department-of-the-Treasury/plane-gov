"use client";

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SitesStateService } from "@plane/services";
import type { IState } from "@plane/types";
import { sortStates } from "@/helpers/state.helper";
import { queryKeys } from "./query-keys";

const stateService = new SitesStateService();

/**
 * Hook to fetch states for a published project.
 * Replaces MobX StateStore.fetchStates.
 */
export function useStates(anchor: string) {
  const query = useQuery({
    queryKey: queryKeys.states.all(anchor),
    queryFn: () => stateService.list(anchor),
    enabled: !!anchor,
    staleTime: 5 * 60 * 1000, // 5 minutes - states rarely change
    gcTime: 30 * 60 * 1000,
  });

  const sortedStates = useMemo(() => {
    if (!query.data) return undefined;
    return sortStates([...query.data]);
  }, [query.data]);

  const getStateById = useCallback(
    (stateId: string | undefined): IState | undefined => {
      if (!stateId || !query.data) return undefined;
      return query.data.find((state) => state.id === stateId);
    },
    [query.data]
  );

  return {
    ...query,
    sortedStates,
    getStateById,
  };
}

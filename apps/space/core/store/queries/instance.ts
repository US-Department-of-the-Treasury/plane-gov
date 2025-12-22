"use client";

import { useQuery } from "@tanstack/react-query";
import { InstanceService } from "@plane/services";
import { queryKeys } from "./query-keys";

const instanceService = new InstanceService();

/**
 * Hook to fetch instance information.
 * Replaces MobX InstanceStore.fetchInstanceInfo.
 */
export function useInstance() {
  return useQuery({
    queryKey: queryKeys.instance.info(),
    queryFn: () => instanceService.info(),
    staleTime: 5 * 60 * 1000, // 5 minutes - instance info rarely changes
    gcTime: 30 * 60 * 1000,
    retry: 0, // Don't retry instance info (might be intentionally down)
  });
}

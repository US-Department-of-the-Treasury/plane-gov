"use client";

import { useQuery } from "@tanstack/react-query";
import type { IInstanceInfo } from "@plane/types";
import { InstanceService } from "@/services/instance.service";
import { queryKeys } from "./query-keys";

// Service instance
const instanceService = new InstanceService();

/**
 * Hook to fetch instance information.
 * Replaces MobX InstanceStore.fetchInstanceInfo for read operations.
 *
 * @example
 * const { data: instanceInfo, isLoading, error } = useInstanceInfo();
 */
export function useInstanceInfo() {
  return useQuery({
    queryKey: queryKeys.instance.info(),
    queryFn: () => instanceService.getInstanceInfo(),
    staleTime: 10 * 60 * 1000, // 10 minutes - instance config rarely changes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: (failureCount, error) => {
      // Don't retry on certain errors
      if (error && typeof error === "object" && "status" in error) {
        const status = (error as { status?: number }).status;
        // Don't retry on client errors
        if (status && status >= 400 && status < 500) return false;
      }
      return failureCount < 2;
    },
  });
}

// Utility functions for derived data (used inline by components)

/**
 * Get instance configuration from instance info.
 *
 * @example
 * const { data: instanceInfo } = useInstanceInfo();
 * const config = getInstanceConfig(instanceInfo);
 */
export function getInstanceConfig(instanceInfo: IInstanceInfo | undefined) {
  return instanceInfo?.config;
}

/**
 * Get instance details from instance info.
 *
 * @example
 * const { data: instanceInfo } = useInstanceInfo();
 * const instance = getInstance(instanceInfo);
 */
export function getInstance(instanceInfo: IInstanceInfo | undefined) {
  return instanceInfo?.instance;
}

/**
 * Check if instance is configured.
 *
 * @example
 * const { data: instanceInfo } = useInstanceInfo();
 * const isConfigured = isInstanceConfigured(instanceInfo);
 */
export function isInstanceConfigured(instanceInfo: IInstanceInfo | undefined): boolean {
  return !!instanceInfo?.instance;
}

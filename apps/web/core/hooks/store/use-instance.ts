"use client";

import {
  useInstanceInfo as useInstanceInfoQuery,
  getInstanceConfig as getConfig,
  getInstance as getInstanceData,
  isInstanceConfigured as checkInstanceConfigured,
} from "@/store/queries";

/**
 * Re-export instance hooks with a clear namespace.
 * This provides a gradual migration path from MobX to TanStack Query.
 *
 * Usage:
 * Backward-compatible: const { config, instance, isLoading } = useInstance();
 * Or use directly: const { data: instanceInfo, isLoading } = useInstanceInfo();
 *
 * For derived data:
 * const config = getInstanceConfig(instanceInfo);
 * const instance = getInstance(instanceInfo);
 */
export {
  useInstanceInfoQuery as useInstanceInfo,
  getConfig as getInstanceConfig,
  getInstanceData as getInstance,
  checkInstanceConfigured as isInstanceConfigured,
};

/**
 * Backward-compatible hook that provides the same interface as the old MobX store.
 * Internally uses useInstanceInfo() from TanStack Query.
 *
 * @example
 * const { config, instance, isLoading } = useInstance();
 * const { error, fetchInstanceInfo } = useInstance();
 */
export function useInstance() {
  const { data: instanceInfo, isLoading, error, refetch } = useInstanceInfoQuery();

  return {
    instance: getInstanceData(instanceInfo),
    config: getConfig(instanceInfo),
    isLoading,
    error: error ? { status: "error", message: String(error) } : undefined,
    fetchInstanceInfo: refetch,
  };
}

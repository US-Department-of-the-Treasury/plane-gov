"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InstanceService } from "@plane/services";
import type {
  IInstance,
  IInstanceAdmin,
  IInstanceConfiguration,
  IFormattedInstanceConfiguration,
} from "@plane/types";
import { queryKeys } from "./query-keys";

const instanceService = new InstanceService();

/**
 * Hook to fetch instance information.
 * Replaces MobX InstanceStore.fetchInstanceInfo.
 */
export function useInstanceInfo() {
  return useQuery({
    queryKey: queryKeys.instance.info(),
    queryFn: () => instanceService.info(),
    staleTime: 5 * 60 * 1000, // 5 minutes - instance info rarely changes
    gcTime: 30 * 60 * 1000,
    retry: 0, // Don't retry instance info (might be intentionally down)
  });
}

/**
 * Hook to update instance information.
 * Replaces MobX InstanceStore.updateInstanceInfo.
 */
export function useUpdateInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IInstance>) => instanceService.update(data),
    onSuccess: (updatedInstance) => {
      // Update the instance info cache with the new data
      queryClient.setQueryData(queryKeys.instance.info(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          instance: updatedInstance,
        };
      });
    },
  });
}

/**
 * Hook to fetch instance admins.
 * Replaces MobX InstanceStore.fetchInstanceAdmins.
 */
export function useInstanceAdmins() {
  return useQuery({
    queryKey: queryKeys.instance.admins(),
    queryFn: () => instanceService.admins(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch instance configurations.
 * Replaces MobX InstanceStore.fetchInstanceConfigurations.
 */
export function useInstanceConfigurations() {
  return useQuery({
    queryKey: queryKeys.instance.configurations(),
    queryFn: () => instanceService.configurations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to update instance configurations.
 * Replaces MobX InstanceStore.updateInstanceConfigurations.
 */
export function useUpdateInstanceConfigurations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IFormattedInstanceConfiguration>) => instanceService.updateConfigurations(data),
    onSuccess: (updatedConfigurations: IInstanceConfiguration[]) => {
      // Update the configurations cache by merging updated values
      queryClient.setQueryData(queryKeys.instance.configurations(), (old: IInstanceConfiguration[] | undefined) => {
        if (!old) return updatedConfigurations;
        return old.map((config) => {
          const updated = updatedConfigurations.find((item) => item.key === config.key);
          return updated || config;
        });
      });
    },
  });
}

/**
 * Hook to disable email configuration.
 * Replaces MobX InstanceStore.disableEmail.
 */
export function useDisableEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => instanceService.disableEmail(),
    onMutate: async () => {
      // Optimistically update the cache
      const previousConfigurations = queryClient.getQueryData<IInstanceConfiguration[]>(
        queryKeys.instance.configurations()
      );

      queryClient.setQueryData(queryKeys.instance.configurations(), (old: IInstanceConfiguration[] | undefined) => {
        if (!old) return old;
        return old.map((config) => {
          if (
            ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_HOST_USER", "EMAIL_HOST_PASSWORD", "EMAIL_FROM", "ENABLE_SMTP"].includes(
              config.key
            )
          ) {
            return { ...config, value: "" };
          }
          return config;
        });
      });

      return { previousConfigurations };
    },
    onError: (error, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousConfigurations) {
        queryClient.setQueryData(queryKeys.instance.configurations(), context.previousConfigurations);
      }
    },
  });
}

/**
 * Utility to compute formatted configurations for forms.
 * Replaces MobX InstanceStore.formattedConfig computed value.
 */
export function computeFormattedConfig(
  configurations: IInstanceConfiguration[] | undefined
): IFormattedInstanceConfiguration | undefined {
  if (!configurations) return undefined;
  return configurations.reduce((formData: IFormattedInstanceConfiguration, config) => {
    formData[config.key] = config.value;
    return formData;
  }, {} as IFormattedInstanceConfiguration);
}

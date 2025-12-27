"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IApiToken } from "@plane/types";
import { APITokenService } from "@plane/services";
import { queryKeys } from "./query-keys";

// Service instance
const apiTokenService = new APITokenService();

/**
 * Hook to fetch all API tokens for a workspace.
 * Replaces MobX ApiTokenStore.fetchApiTokens for read operations.
 *
 * @example
 * const { data: tokens, isLoading } = useApiTokens(workspaceSlug);
 */
export function useApiTokens(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.apiTokens.all(workspaceSlug),
    queryFn: () => apiTokenService.list(),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch API token details by ID.
 * Replaces MobX ApiTokenStore.fetchApiTokenDetails for read operations.
 *
 * @example
 * const { data: token, isLoading } = useApiTokenDetails(workspaceSlug, tokenId);
 */
export function useApiTokenDetails(workspaceSlug: string, tokenId: string) {
  return useQuery({
    queryKey: queryKeys.apiTokens.detail(tokenId),
    queryFn: () => apiTokenService.retrieve(tokenId),
    enabled: !!workspaceSlug && !!tokenId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export interface CreateApiTokenParams {
  workspaceSlug: string;
  data: Partial<IApiToken>;
}

/**
 * Hook to create a new API token with optimistic updates.
 * Replaces MobX ApiTokenStore.createApiToken for write operations.
 *
 * @example
 * const { mutate: createToken, isPending } = useCreateApiToken();
 * createToken({ workspaceSlug, data: { label: "My Token" } });
 */
export function useCreateApiToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: CreateApiTokenParams) => apiTokenService.create(data),
    onMutate: async ({ workspaceSlug, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.apiTokens.all(workspaceSlug) });

      const previousTokens = queryClient.getQueryData<IApiToken[]>(queryKeys.apiTokens.all(workspaceSlug));

      // Optimistic update with temporary ID
      if (previousTokens) {
        const optimisticToken: IApiToken = {
          id: `temp-${Date.now()}`,
          label: data.label ?? "",
          token: "",
          user: "",
          description: data.description ?? "",
          expired_at: data.expired_at ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: "",
          updated_by: "",
          last_used: null,
          user_type: 0,
          is_active: true,
          workspace: "",
        };
        queryClient.setQueryData<IApiToken[]>(queryKeys.apiTokens.all(workspaceSlug), [
          ...previousTokens,
          optimisticToken,
        ]);
      }

      return { previousTokens, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTokens && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.apiTokens.all(context.workspaceSlug), context.previousTokens);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens.all(workspaceSlug) });
    },
  });
}

export interface DeleteApiTokenParams {
  workspaceSlug: string;
  tokenId: string;
}

/**
 * Hook to delete an API token with optimistic updates.
 * Replaces MobX ApiTokenStore.deleteApiToken for write operations.
 *
 * @example
 * const { mutate: deleteToken, isPending } = useDeleteApiToken();
 * deleteToken({ workspaceSlug, tokenId });
 */
export function useDeleteApiToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tokenId }: DeleteApiTokenParams) => apiTokenService.destroy(tokenId),
    onMutate: async ({ workspaceSlug, tokenId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.apiTokens.all(workspaceSlug) });

      const previousTokens = queryClient.getQueryData<IApiToken[]>(queryKeys.apiTokens.all(workspaceSlug));

      if (previousTokens) {
        queryClient.setQueryData<IApiToken[]>(
          queryKeys.apiTokens.all(workspaceSlug),
          previousTokens.filter((token) => token.id !== tokenId)
        );
      }

      return { previousTokens, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTokens && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.apiTokens.all(context.workspaceSlug), context.previousTokens);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, tokenId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.apiTokens.detail(tokenId) });
    },
  });
}

// Utility functions for derived data

/**
 * Get API token by ID from tokens array.
 *
 * @example
 * const { data: tokens } = useApiTokens(workspaceSlug);
 * const token = getApiTokenById(tokens, tokenId);
 */
export function getApiTokenById(tokens: IApiToken[] | undefined, tokenId: string | null | undefined): IApiToken | undefined {
  if (!tokens || !tokenId) return undefined;
  return tokens.find((token) => token.id === tokenId);
}

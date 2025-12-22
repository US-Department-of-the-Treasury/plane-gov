"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IWebhook } from "@plane/types";
import { WebhookService } from "@/services/webhook.service";
import { queryKeys } from "./query-keys";

// Service instance
const webhookService = new WebhookService();

/**
 * Hook to fetch all webhooks for a workspace.
 * Replaces MobX WebhookStore.fetchWebhooks for read operations.
 *
 * @example
 * const { data: webhooks, isLoading } = useWebhooks(workspaceSlug);
 */
export function useWebhooks(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.webhooks.all(workspaceSlug),
    queryFn: () => webhookService.fetchWebhooksList(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch webhook details by ID.
 * Replaces MobX WebhookStore.fetchWebhookById for read operations.
 *
 * @example
 * const { data: webhook, isLoading } = useWebhookDetails(workspaceSlug, webhookId);
 */
export function useWebhookDetails(workspaceSlug: string, webhookId: string) {
  return useQuery({
    queryKey: queryKeys.webhooks.detail(webhookId),
    queryFn: () => webhookService.fetchWebhookDetails(workspaceSlug, webhookId),
    enabled: !!workspaceSlug && !!webhookId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateWebhookParams {
  workspaceSlug: string;
  data: Partial<IWebhook>;
}

/**
 * Hook to create a new webhook with optimistic updates.
 * Replaces MobX WebhookStore.createWebhook for write operations.
 * Returns both webhook and secret key.
 *
 * @example
 * const { mutate: createWebhook, isPending } = useCreateWebhook();
 * createWebhook({ workspaceSlug, data: { url: "https://example.com/webhook" } });
 */
export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }: CreateWebhookParams) =>
      webhookService.createWebhook(workspaceSlug, data),
    onMutate: async ({ workspaceSlug, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.webhooks.all(workspaceSlug) });

      const previousWebhooks = queryClient.getQueryData<IWebhook[]>(queryKeys.webhooks.all(workspaceSlug));

      // Optimistic update with temporary ID
      if (previousWebhooks) {
        const optimisticWebhook: IWebhook = {
          id: `temp-${Date.now()}`,
          url: data.url ?? "",
          is_active: data.is_active ?? true,
          secret_key: undefined,
          project: data.project ?? false,
          sprint: data.sprint ?? false,
          issue: data.issue ?? false,
          issue_comment: data.issue_comment ?? false,
          epic: data.epic ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<IWebhook[]>(queryKeys.webhooks.all(workspaceSlug), [
          ...previousWebhooks,
          optimisticWebhook,
        ]);
      }

      return { previousWebhooks, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWebhooks && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.webhooks.all(context.workspaceSlug), context.previousWebhooks);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all(workspaceSlug) });
    },
  });
}

interface UpdateWebhookParams {
  workspaceSlug: string;
  webhookId: string;
  data: Partial<IWebhook>;
}

/**
 * Hook to update a webhook with optimistic updates.
 * Replaces MobX WebhookStore.updateWebhook for write operations.
 *
 * @example
 * const { mutate: updateWebhook, isPending } = useUpdateWebhook();
 * updateWebhook({ workspaceSlug, webhookId, data: { is_active: false } });
 */
export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, webhookId, data }: UpdateWebhookParams) =>
      webhookService.updateWebhook(workspaceSlug, webhookId, data),
    onMutate: async ({ workspaceSlug, webhookId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.webhooks.all(workspaceSlug) });
      await queryClient.cancelQueries({ queryKey: queryKeys.webhooks.detail(webhookId) });

      const previousWebhooks = queryClient.getQueryData<IWebhook[]>(queryKeys.webhooks.all(workspaceSlug));
      const previousWebhookDetail = queryClient.getQueryData<IWebhook>(queryKeys.webhooks.detail(webhookId));

      if (previousWebhooks) {
        queryClient.setQueryData<IWebhook[]>(
          queryKeys.webhooks.all(workspaceSlug),
          previousWebhooks.map((webhook) => (webhook.id === webhookId ? { ...webhook, ...data } : webhook))
        );
      }

      if (previousWebhookDetail) {
        queryClient.setQueryData<IWebhook>(queryKeys.webhooks.detail(webhookId), {
          ...previousWebhookDetail,
          ...data,
        });
      }

      return { previousWebhooks, previousWebhookDetail, workspaceSlug, webhookId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousWebhooks) {
          queryClient.setQueryData(queryKeys.webhooks.all(context.workspaceSlug), context.previousWebhooks);
        }
        if (context.previousWebhookDetail) {
          queryClient.setQueryData(queryKeys.webhooks.detail(context.webhookId), context.previousWebhookDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, webhookId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.detail(webhookId) });
    },
  });
}

interface DeleteWebhookParams {
  workspaceSlug: string;
  webhookId: string;
}

/**
 * Hook to delete a webhook with optimistic updates.
 * Replaces MobX WebhookStore.removeWebhook for write operations.
 *
 * @example
 * const { mutate: deleteWebhook, isPending } = useDeleteWebhook();
 * deleteWebhook({ workspaceSlug, webhookId });
 */
export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, webhookId }: DeleteWebhookParams) =>
      webhookService.deleteWebhook(workspaceSlug, webhookId),
    onMutate: async ({ workspaceSlug, webhookId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.webhooks.all(workspaceSlug) });

      const previousWebhooks = queryClient.getQueryData<IWebhook[]>(queryKeys.webhooks.all(workspaceSlug));

      if (previousWebhooks) {
        queryClient.setQueryData<IWebhook[]>(
          queryKeys.webhooks.all(workspaceSlug),
          previousWebhooks.filter((webhook) => webhook.id !== webhookId)
        );
      }

      return { previousWebhooks, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWebhooks && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.webhooks.all(context.workspaceSlug), context.previousWebhooks);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, webhookId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.webhooks.detail(webhookId) });
    },
  });
}

interface RegenerateSecretKeyParams {
  workspaceSlug: string;
  webhookId: string;
}

/**
 * Hook to regenerate webhook secret key.
 * Replaces MobX WebhookStore.regenerateSecretKey for write operations.
 * Returns both updated webhook and new secret key.
 *
 * @example
 * const { mutate: regenerateSecretKey, isPending } = useRegenerateWebhookSecretKey();
 * regenerateSecretKey({ workspaceSlug, webhookId });
 */
export function useRegenerateWebhookSecretKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, webhookId }: RegenerateSecretKeyParams) =>
      webhookService.regenerateSecretKey(workspaceSlug, webhookId),
    onSettled: (_data, _error, { workspaceSlug, webhookId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.detail(webhookId) });
    },
  });
}

// Utility functions for derived data

/**
 * Get webhook by ID from a webhooks array.
 *
 * @example
 * const { data: webhooks } = useWebhooks(workspaceSlug);
 * const webhook = getWebhookById(webhooks, webhookId);
 */
export function getWebhookById(
  webhooks: IWebhook[] | undefined,
  webhookId: string | null | undefined
): IWebhook | undefined {
  if (!webhooks || !webhookId) return undefined;
  return webhooks.find((webhook) => webhook.id === webhookId);
}

/**
 * Get active webhooks (is_active = true).
 *
 * @example
 * const { data: webhooks } = useWebhooks(workspaceSlug);
 * const activeWebhooks = getActiveWebhooks(webhooks);
 */
export function getActiveWebhooks(webhooks: IWebhook[] | undefined): IWebhook[] {
  if (!webhooks) return [];
  return webhooks.filter((webhook) => webhook.is_active);
}

/**
 * Get inactive webhooks (is_active = false).
 *
 * @example
 * const { data: webhooks } = useWebhooks(workspaceSlug);
 * const inactiveWebhooks = getInactiveWebhooks(webhooks);
 */
export function getInactiveWebhooks(webhooks: IWebhook[] | undefined): IWebhook[] {
  if (!webhooks) return [];
  return webhooks.filter((webhook) => !webhook.is_active);
}

/**
 * Get webhook IDs from webhooks array.
 *
 * @example
 * const { data: webhooks } = useWebhooks(workspaceSlug);
 * const webhookIds = getWebhookIds(webhooks);
 */
export function getWebhookIds(webhooks: IWebhook[] | undefined): string[] {
  if (!webhooks) return [];
  return webhooks.map((webhook) => webhook.id ?? "").filter(Boolean);
}

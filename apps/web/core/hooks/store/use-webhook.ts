import type { IWebhook } from "@plane/types";
import {
  useWebhooks,
  useWebhookDetails,
  getWebhookById,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useRegenerateWebhookSecretKey,
} from "@/store/queries";
import { useParams } from "@/hooks/store/use-router-params";

/**
 * Hook to access webhook data and methods.
 * Migrated from MobX WebhookStore to TanStack Query.
 *
 * @returns Object with webhooks data and methods
 *
 * @example
 * const { webhooks, isLoading, createWebhook, updateWebhook } = useWebhook();
 */
export const useWebhook = () => {
  const { workspaceSlug, webhookId } = useParams();

  // Fetch webhooks list
  const { data: webhooks, isLoading, error } = useWebhooks(workspaceSlug ?? "");

  // Fetch current webhook details if webhookId is present
  const { data: currentWebhook } = useWebhookDetails(workspaceSlug ?? "", webhookId ?? "");

  // Mutations
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();
  const regenerateSecretKeyMutation = useRegenerateWebhookSecretKey();

  return {
    // Data
    webhooks: webhooks ?? [],
    currentWebhook,
    webhookSecretKey: null, // Secret key is returned by create/regenerate mutations

    // Loading states
    isLoading,
    error,

    // Methods
    getWebhookById: (id: string) => getWebhookById(webhooks, id),

    // Mutations
    fetchWebhooks: (slug: string) => {
      // Data is already fetched via useWebhooks
      return Promise.resolve(webhooks ?? []);
    },
    fetchWebhookById: (slug: string, id: string) => {
      // Data is already fetched via useWebhookDetails
      const webhook = getWebhookById(webhooks, id);
      return Promise.resolve(webhook);
    },
    createWebhook: (slug: string, data: Partial<IWebhook>) => {
      const targetSlug = slug || workspaceSlug;
      if (!targetSlug) return Promise.reject(new Error("Workspace slug is required"));
      return new Promise<{ webHook: IWebhook; secretKey: string | null }>((resolve, reject) => {
        createWebhookMutation.mutate(
          { workspaceSlug: targetSlug, data },
          {
            onSuccess: (response) => {
              resolve({
                webHook: response,
                secretKey: response.secret_key ?? null,
              });
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    updateWebhook: (slug: string, id: string, data: Partial<IWebhook>) => {
      const targetSlug = slug || workspaceSlug;
      if (!targetSlug) return Promise.reject(new Error("Workspace slug is required"));
      return new Promise<IWebhook>((resolve, reject) => {
        updateWebhookMutation.mutate(
          { workspaceSlug: targetSlug, webhookId: id, data },
          {
            onSuccess: (response) => {
              resolve(response);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    removeWebhook: (slug: string, id: string) => {
      const targetSlug = slug || workspaceSlug;
      if (!targetSlug) return Promise.reject(new Error("Workspace slug is required"));
      return new Promise<void>((resolve, reject) => {
        deleteWebhookMutation.mutate(
          { workspaceSlug: targetSlug, webhookId: id },
          {
            onSuccess: () => {
              resolve();
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    regenerateSecretKey: (slug: string, id: string) => {
      const targetSlug = slug || workspaceSlug;
      if (!targetSlug) return Promise.reject(new Error("Workspace slug is required"));
      return new Promise<{ webHook: IWebhook; secretKey: string | null }>((resolve, reject) => {
        regenerateSecretKeyMutation.mutate(
          { workspaceSlug: targetSlug, webhookId: id },
          {
            onSuccess: (response) => {
              resolve({
                webHook: response,
                secretKey: response.secret_key ?? null,
              });
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    clearSecretKey: () => {
      // This is now handled by the component state if needed
      // No need to store in global state
    },

    // Mutation states
    isCreating: createWebhookMutation.isPending,
    isUpdating: updateWebhookMutation.isPending,
    isDeleting: deleteWebhookMutation.isPending,
    isRegenerating: regenerateSecretKeyMutation.isPending,
  };
};

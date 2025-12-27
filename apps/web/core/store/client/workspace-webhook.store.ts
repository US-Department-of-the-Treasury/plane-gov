import { create } from "zustand";
import type { IWebhook } from "@plane/types";
import { WebhookService } from "@/services/webhook.service";
import { getRouterWebhookId } from "./router.store";

/**
 * Webhook Store State
 */
interface WebhookStoreState {
  webhooks: Record<string, IWebhook> | null;
  webhookSecretKey: string | null;
}

/**
 * Webhook Store Actions
 */
interface WebhookStoreActions {
  // Sync actions
  setWebhooks: (webhooks: Record<string, IWebhook> | null) => void;
  setWebhook: (webhook: IWebhook) => void;
  setWebhookSecretKey: (key: string | null) => void;
  deleteWebhook: (webhookId: string) => void;

  // Getters
  getWebhookById: (webhookId: string) => IWebhook | null;

  // Fetch actions
  fetchWebhooks: (workspaceSlug: string) => Promise<IWebhook[]>;
  fetchWebhookById: (workspaceSlug: string, webhookId: string) => Promise<IWebhook>;

  // CRUD actions
  createWebhook: (
    workspaceSlug: string,
    data: Partial<IWebhook>
  ) => Promise<{ webHook: IWebhook; secretKey: string | null }>;
  updateWebhook: (workspaceSlug: string, webhookId: string, data: Partial<IWebhook>) => Promise<IWebhook>;
  removeWebhook: (workspaceSlug: string, webhookId: string) => Promise<void>;

  // Secret key actions
  regenerateSecretKey: (
    workspaceSlug: string,
    webhookId: string
  ) => Promise<{ webHook: IWebhook; secretKey: string | null }>;
  clearSecretKey: () => void;
}

/**
 * Combined Webhook Store Type
 */
export type WebhookStore = WebhookStoreState & WebhookStoreActions;

/**
 * Initial state
 */
const initialState: WebhookStoreState = {
  webhooks: null,
  webhookSecretKey: null,
};

/**
 * Webhook Store (Zustand)
 *
 * Manages webhook data and operations for workspaces.
 * Migrated from MobX WebhookStore to Zustand.
 */
export const useWebhookStore = create<WebhookStore>()((set, get) => ({
  ...initialState,

  // Sync actions
  setWebhooks: (webhooks) => {
    set({ webhooks });
  },

  setWebhook: (webhook) => {
    set((state) => ({
      webhooks: {
        ...state.webhooks,
        [webhook.id]: webhook,
      },
    }));
  },

  setWebhookSecretKey: (key) => {
    set({ webhookSecretKey: key });
  },

  deleteWebhook: (webhookId) => {
    set((state) => {
      const newWebhooks = { ...state.webhooks };
      delete newWebhooks[webhookId];
      return { webhooks: newWebhooks };
    });
  },

  // Getters
  getWebhookById: (webhookId) => {
    const { webhooks } = get();
    return webhooks?.[webhookId] || null;
  },

  // Fetch actions
  fetchWebhooks: async (workspaceSlug) => {
    const service = new WebhookService();
    const response = await service.fetchWebhooksList(workspaceSlug);

    const webHookObject: Record<string, IWebhook> = response.reduce((accumulator, currentWebhook) => {
      if (currentWebhook && currentWebhook.id) {
        return { ...accumulator, [currentWebhook.id]: currentWebhook };
      }
      return accumulator;
    }, {});

    set({ webhooks: webHookObject });
    return response;
  },

  fetchWebhookById: async (workspaceSlug, webhookId) => {
    const service = new WebhookService();
    const response = await service.fetchWebhookDetails(workspaceSlug, webhookId);

    set((state) => ({
      webhooks: {
        ...state.webhooks,
        [response.id]: response,
      },
    }));

    return response;
  },

  // CRUD actions
  createWebhook: async (workspaceSlug, data) => {
    const service = new WebhookService();
    const response = await service.createWebhook(workspaceSlug, data);

    const secretKey = response?.secret_key ?? null;
    delete response?.secret_key;

    set((state) => {
      const newWebhooks = { ...state.webhooks };
      if (response && response.id) {
        newWebhooks[response.id] = response;
      }
      return {
        webhooks: newWebhooks,
        webhookSecretKey: secretKey,
      };
    });

    return { webHook: response, secretKey };
  },

  updateWebhook: async (workspaceSlug, webhookId, data) => {
    const service = new WebhookService();
    const response = await service.updateWebhook(workspaceSlug, webhookId, data);

    set((state) => {
      const currentWebhook = state.webhooks?.[webhookId];
      return {
        webhooks: {
          ...state.webhooks,
          [webhookId]: { ...currentWebhook, ...data } as IWebhook,
        },
      };
    });

    return response;
  },

  removeWebhook: async (workspaceSlug, webhookId) => {
    const service = new WebhookService();
    await service.deleteWebhook(workspaceSlug, webhookId);

    set((state) => {
      const newWebhooks = { ...(state.webhooks ?? {}) };
      delete newWebhooks[webhookId];
      return { webhooks: newWebhooks };
    });
  },

  // Secret key actions
  regenerateSecretKey: async (workspaceSlug, webhookId) => {
    const service = new WebhookService();
    const response = await service.regenerateSecretKey(workspaceSlug, webhookId);

    const secretKey = response?.secret_key ?? null;
    delete response?.secret_key;

    set((state) => {
      const newWebhooks = { ...state.webhooks };
      if (response && response.id) {
        newWebhooks[response.id] = response;
      }
      return {
        webhooks: newWebhooks,
        webhookSecretKey: secretKey,
      };
    });

    return { webHook: response, secretKey };
  },

  clearSecretKey: () => {
    set({ webhookSecretKey: null });
  },
}));

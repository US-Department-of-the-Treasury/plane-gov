import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { IWebhook } from "@plane/types";
// services
import { WebhookService } from "@/services/webhook.service";
// store
import type { CoreRootStore } from "../root.store";

// Zustand Store
interface WebhookState {
  webhooks: Record<string, IWebhook> | null;
  webhookSecretKey: string | null;
}

interface WebhookActions {
  fetchWebhooks: (workspaceSlug: string) => Promise<IWebhook[]>;
  fetchWebhookById: (workspaceSlug: string, webhookId: string) => Promise<IWebhook>;
  createWebhook: (
    workspaceSlug: string,
    data: Partial<IWebhook>
  ) => Promise<{ webHook: IWebhook; secretKey: string | null }>;
  updateWebhook: (workspaceSlug: string, webhookId: string, data: Partial<IWebhook>) => Promise<IWebhook>;
  removeWebhook: (workspaceSlug: string, webhookId: string) => Promise<void>;
  regenerateSecretKey: (
    workspaceSlug: string,
    webhookId: string
  ) => Promise<{ webHook: IWebhook; secretKey: string | null }>;
  clearSecretKey: () => void;
}

type WebhookStoreType = WebhookState & WebhookActions;

const webhookService = new WebhookService();

export const useWebhookStore = create<WebhookStoreType>()(
  immer((set, get) => ({
    // State
    webhooks: null,
    webhookSecretKey: null,

    // Actions
    fetchWebhooks: async (workspaceSlug) => {
      const response = await webhookService.fetchWebhooksList(workspaceSlug);
      const webHookObject: { [webhookId: string]: IWebhook } = response.reduce((accumulator, currentWebhook) => {
        if (currentWebhook && currentWebhook.id) {
          return { ...accumulator, [currentWebhook.id]: currentWebhook };
        }
        return accumulator;
      }, {});
      set((state) => {
        state.webhooks = webHookObject;
      });
      return response;
    },

    fetchWebhookById: async (workspaceSlug, webhookId) => {
      const response = await webhookService.fetchWebhookDetails(workspaceSlug, webhookId);
      set((state) => {
        state.webhooks = {
          ...state.webhooks,
          [response.id]: response,
        };
      });
      return response;
    },

    createWebhook: async (workspaceSlug, data) => {
      const response = await webhookService.createWebhook(workspaceSlug, data);
      const _secretKey = response?.secret_key ?? null;
      delete response?.secret_key;

      set((state) => {
        const _webhooks = state.webhooks;
        if (response && response.id && _webhooks) {
          _webhooks[response.id] = response;
        }
        state.webhookSecretKey = _secretKey || null;
        state.webhooks = _webhooks;
      });
      return { webHook: response, secretKey: _secretKey };
    },

    updateWebhook: async (workspaceSlug, webhookId, data) => {
      const response = await webhookService.updateWebhook(workspaceSlug, webhookId, data);
      set((state) => {
        if (webhookId && state.webhooks && state.webhooks[webhookId]) {
          state.webhooks[webhookId] = { ...state.webhooks[webhookId], ...data };
        }
      });
      return response;
    },

    removeWebhook: async (workspaceSlug, webhookId) => {
      await webhookService.deleteWebhook(workspaceSlug, webhookId);
      set((state) => {
        if (state.webhooks && state.webhooks[webhookId]) {
          delete state.webhooks[webhookId];
        }
      });
    },

    regenerateSecretKey: async (workspaceSlug, webhookId) => {
      const response = await webhookService.regenerateSecretKey(workspaceSlug, webhookId);
      const _secretKey = response?.secret_key ?? null;
      delete response?.secret_key;

      set((state) => {
        const _webhooks = state.webhooks;
        if (_webhooks && response && response.id) {
          _webhooks[response.id] = response;
        }
        state.webhookSecretKey = _secretKey || null;
        state.webhooks = _webhooks;
      });
      return { webHook: response, secretKey: _secretKey };
    },

    clearSecretKey: () => {
      set((state) => {
        state.webhookSecretKey = null;
      });
    },
  }))
);

// Legacy interface for backward compatibility
export interface IWebhookStore {
  // observables
  webhooks: Record<string, IWebhook> | null;
  webhookSecretKey: string | null;
  // computed
  currentWebhook: IWebhook | null;
  // computed actions
  getWebhookById: (webhookId: string) => IWebhook | null;
  // fetch actions
  fetchWebhooks: (workspaceSlug: string) => Promise<IWebhook[]>;
  fetchWebhookById: (workspaceSlug: string, webhookId: string) => Promise<IWebhook>;
  // crud actions
  createWebhook: (
    workspaceSlug: string,
    data: Partial<IWebhook>
  ) => Promise<{ webHook: IWebhook; secretKey: string | null }>;
  updateWebhook: (workspaceSlug: string, webhookId: string, data: Partial<IWebhook>) => Promise<IWebhook>;
  removeWebhook: (workspaceSlug: string, webhookId: string) => Promise<void>;
  // secret key actions
  regenerateSecretKey: (
    workspaceSlug: string,
    webhookId: string
  ) => Promise<{ webHook: IWebhook; secretKey: string | null }>;
  clearSecretKey: () => void;
}

// Legacy class wrapper for backward compatibility
export class WebhookStore implements IWebhookStore {
  private rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    this.rootStore = _rootStore;
  }

  private get store() {
    return useWebhookStore.getState();
  }

  get webhooks() {
    return this.store.webhooks;
  }

  get webhookSecretKey() {
    return this.store.webhookSecretKey;
  }

  /**
   * computed value of current webhook based on webhook id saved in the query store
   */
  get currentWebhook() {
    const webhookId = this.rootStore.router.webhookId;
    if (!webhookId) return null;
    const currentWebhook = this.store.webhooks?.[webhookId] ?? null;
    return currentWebhook;
  }

  /**
   * get webhook info from the object of webhooks in the store using webhook id
   * @param webhookId
   */
  getWebhookById = (webhookId: string) => this.store.webhooks?.[webhookId] || null;

  // Actions
  fetchWebhooks = (workspaceSlug: string) => this.store.fetchWebhooks(workspaceSlug);
  fetchWebhookById = (workspaceSlug: string, webhookId: string) => this.store.fetchWebhookById(workspaceSlug, webhookId);
  createWebhook = (workspaceSlug: string, data: Partial<IWebhook>) => this.store.createWebhook(workspaceSlug, data);
  updateWebhook = (workspaceSlug: string, webhookId: string, data: Partial<IWebhook>) =>
    this.store.updateWebhook(workspaceSlug, webhookId, data);
  removeWebhook = (workspaceSlug: string, webhookId: string) => this.store.removeWebhook(workspaceSlug, webhookId);
  regenerateSecretKey = (workspaceSlug: string, webhookId: string) =>
    this.store.regenerateSecretKey(workspaceSlug, webhookId);
  clearSecretKey = () => this.store.clearSecretKey();
}

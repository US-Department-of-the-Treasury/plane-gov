import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import { APITokenService } from "@plane/services";
import type { IApiToken } from "@plane/types";
// store
import type { CoreRootStore } from "../root.store";

// Zustand Store
interface ApiTokenState {
  apiTokens: Record<string, IApiToken> | null;
}

interface ApiTokenActions {
  fetchApiTokens: () => Promise<IApiToken[]>;
  fetchApiTokenDetails: (tokenId: string) => Promise<IApiToken>;
  createApiToken: (data: Partial<IApiToken>) => Promise<IApiToken>;
  deleteApiToken: (tokenId: string) => Promise<void>;
}

type ApiTokenStoreType = ApiTokenState & ApiTokenActions;

const apiTokenService = new APITokenService();

export const useApiTokenStore = create<ApiTokenStoreType>()(
  immer((set, get) => ({
    // State
    apiTokens: null,

    // Actions
    fetchApiTokens: async () => {
      const response = await apiTokenService.list();
      const apiTokensObject: { [apiTokenId: string]: IApiToken } = response.reduce((accumulator, currentWebhook) => {
        if (currentWebhook && currentWebhook.id) {
          return { ...accumulator, [currentWebhook.id]: currentWebhook };
        }
        return accumulator;
      }, {});
      set((state) => {
        state.apiTokens = apiTokensObject;
      });
      return response;
    },

    fetchApiTokenDetails: async (tokenId) => {
      const response = await apiTokenService.retrieve(tokenId);
      set((state) => {
        state.apiTokens = { ...state.apiTokens, [response.id]: response };
      });
      return response;
    },

    createApiToken: async (data) => {
      const response = await apiTokenService.create(data);
      set((state) => {
        state.apiTokens = { ...state.apiTokens, [response.id]: response };
      });
      return response;
    },

    deleteApiToken: async (tokenId) => {
      await apiTokenService.destroy(tokenId);
      set((state) => {
        if (state.apiTokens && state.apiTokens[tokenId]) {
          const updatedApiTokens = { ...state.apiTokens };
          delete updatedApiTokens[tokenId];
          state.apiTokens = updatedApiTokens;
        }
      });
    },
  }))
);

// Legacy interface for backward compatibility
export interface IApiTokenStore {
  // observables
  apiTokens: Record<string, IApiToken> | null;
  // computed actions
  getApiTokenById: (apiTokenId: string) => IApiToken | null;
  // fetch actions
  fetchApiTokens: () => Promise<IApiToken[]>;
  fetchApiTokenDetails: (tokenId: string) => Promise<IApiToken>;
  // crud actions
  createApiToken: (data: Partial<IApiToken>) => Promise<IApiToken>;
  deleteApiToken: (tokenId: string) => Promise<void>;
}

// Legacy class wrapper for backward compatibility
export class ApiTokenStore implements IApiTokenStore {
  private rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    this.rootStore = _rootStore;
  }

  private get store() {
    return useApiTokenStore.getState();
  }

  get apiTokens() {
    return this.store.apiTokens;
  }

  /**
   * get API token by id
   * @param apiTokenId
   */
  getApiTokenById = (apiTokenId: string) => {
    if (!this.store.apiTokens) return null;
    return this.store.apiTokens[apiTokenId] || null;
  };

  // Actions
  fetchApiTokens = () => this.store.fetchApiTokens();
  fetchApiTokenDetails = (tokenId: string) => this.store.fetchApiTokenDetails(tokenId);
  createApiToken = (data: Partial<IApiToken>) => this.store.createApiToken(data);
  deleteApiToken = (tokenId: string) => this.store.deleteApiToken(tokenId);
}

import { create } from "zustand";
import type { IApiToken } from "@plane/types";
import { APITokenService } from "@plane/services";

/**
 * Workspace API Token state managed by Zustand.
 */
interface WorkspaceApiTokenStoreState {
  apiTokens: Record<string, IApiToken> | null;
}

interface WorkspaceApiTokenStoreActions {
  // Getters
  getApiTokenById: (apiTokenId: string) => IApiToken | null;
  // Fetch actions
  fetchApiTokens: () => Promise<IApiToken[]>;
  fetchApiTokenDetails: (tokenId: string) => Promise<IApiToken>;
  // CRUD actions
  createApiToken: (data: Partial<IApiToken>) => Promise<IApiToken>;
  deleteApiToken: (tokenId: string) => Promise<void>;
}

export type WorkspaceApiTokenStore = WorkspaceApiTokenStoreState & WorkspaceApiTokenStoreActions;

const initialState: WorkspaceApiTokenStoreState = {
  apiTokens: null,
};

// Service instance
const apiTokenService = new APITokenService();

export const useWorkspaceApiTokenStore = create<WorkspaceApiTokenStore>()((set, get) => ({
  ...initialState,

  /**
   * Get API token by id
   * @param apiTokenId
   */
  getApiTokenById: (apiTokenId: string) => {
    const { apiTokens } = get();
    if (!apiTokens) return null;
    return apiTokens[apiTokenId] || null;
  },

  /**
   * Fetch all the API tokens
   */
  fetchApiTokens: async () => {
    const response = await apiTokenService.list();
    const apiTokensObject: { [apiTokenId: string]: IApiToken } = response.reduce((accumulator, currentToken) => {
      if (currentToken && currentToken.id) {
        return { ...accumulator, [currentToken.id]: currentToken };
      }
      return accumulator;
    }, {});
    set({ apiTokens: apiTokensObject });
    return response;
  },

  /**
   * Fetch API token details using token id
   * @param tokenId
   */
  fetchApiTokenDetails: async (tokenId: string) => {
    const response = await apiTokenService.retrieve(tokenId);
    set((state) => ({
      apiTokens: { ...state.apiTokens, [response.id]: response },
    }));
    return response;
  },

  /**
   * Create API token using data
   * @param data
   */
  createApiToken: async (data: Partial<IApiToken>) => {
    const response = await apiTokenService.create(data);
    set((state) => ({
      apiTokens: { ...state.apiTokens, [response.id]: response },
    }));
    return response;
  },

  /**
   * Delete API token using token id
   * @param tokenId
   */
  deleteApiToken: async (tokenId: string) => {
    await apiTokenService.destroy(tokenId);
    set((state) => {
      const updatedApiTokens = { ...state.apiTokens };
      delete updatedApiTokens[tokenId];
      return { apiTokens: updatedApiTokens };
    });
  },
}));

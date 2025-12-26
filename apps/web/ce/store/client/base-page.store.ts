import { create } from "zustand";
import type { StoreApi } from "zustand";
import { set as lodashSet } from "lodash-es";
// plane imports
import { EPageAccess } from "@plane/constants";
import type { TChangeHandlerProps } from "@plane/propel/emoji-icon-picker";
import type { TDocumentPayload, TLogoProps, TNameDescriptionLoader, TPage } from "@plane/types";
// plane web store
import type { RootStore } from "@/plane-web/store/root.store";
import type { TBasePageServices } from "@/store/pages/base-page";
import { getRouterWorkspaceSlug, useFavoriteStore } from "@/store/client";
import { FavoriteService } from "@/services/favorite";
// local imports
import { usePageEditorStore } from "@/store/ui/page-editor.store";

// Service instance at module level
const favoriteService = new FavoriteService();

/**
 * Base Page State Interface
 *
 * Manages state for a single page instance.
 * Migrated from MobX BasePage to Zustand.
 */
export interface BasePageStoreState {
  // Loaders
  isSubmitting: TNameDescriptionLoader;
  isSyncingWithServer: "syncing" | "synced" | "error";

  // Page properties
  id: string | undefined;
  name: string | undefined;
  logo_props: TLogoProps | undefined;
  description: object | undefined;
  description_html: string | undefined;
  color: string | undefined;
  label_ids: string[] | undefined;
  owned_by: string | undefined;
  access: EPageAccess | undefined;
  is_favorite: boolean;
  is_locked: boolean;
  archived_at: string | null | undefined;
  workspace: string | undefined;
  project_ids?: string[] | undefined;
  created_by: string | undefined;
  updated_by: string | undefined;
  created_at: Date | undefined;
  updated_at: Date | undefined;
  deleted_at: Date | undefined;

  // Helpers
  oldName: string;

  // Extended properties from ExtendedBasePage
  asJSONExtended: Record<string, any>;
}

/**
 * Base Page Actions Interface
 */
export interface BasePageStoreActions {
  // Helpers
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  setSyncingStatus: (status: "syncing" | "synced" | "error") => void;

  // Actions
  update: (pageData: Partial<TPage>) => Promise<Partial<TPage> | undefined>;
  updateTitle: (title: string) => void;
  updateDescription: (document: TDocumentPayload) => Promise<void>;
  makePublic: (params: { shouldSync?: boolean }) => Promise<void>;
  makePrivate: (params: { shouldSync?: boolean }) => Promise<void>;
  lock: (params: { shouldSync?: boolean; recursive?: boolean }) => Promise<void>;
  unlock: (params: { shouldSync?: boolean; recursive?: boolean }) => Promise<void>;
  archive: (params: { shouldSync?: boolean; archived_at?: string | null }) => Promise<void>;
  restore: (params: { shouldSync?: boolean }) => Promise<void>;
  updatePageLogo: (value: TChangeHandlerProps) => Promise<void>;
  addToFavorites: () => Promise<void>;
  removePageFromFavorites: () => Promise<void>;
  duplicate: () => Promise<TPage | undefined>;
  mutateProperties: (data: Partial<TPage>, shouldUpdateName?: boolean) => void;

  // Computed getters
  getAsJSON: () => TPage | undefined;
  getIsCurrentUserOwner: (currentUserId: string | undefined) => boolean;
}

/**
 * Combined Base Page Store Type
 */
export type BasePageStore = BasePageStoreState & BasePageStoreActions;

/**
 * Initial state for base page store
 */
const createInitialState = (page: TPage): BasePageStoreState => ({
  isSubmitting: "saved",
  isSyncingWithServer: "syncing",
  id: page?.id || undefined,
  name: page?.name,
  logo_props: page?.logo_props || undefined,
  description: page?.description || undefined,
  description_html: page?.description_html || undefined,
  color: page?.color || undefined,
  label_ids: page?.label_ids || undefined,
  owned_by: page?.owned_by || undefined,
  access: page?.access || EPageAccess.PUBLIC,
  is_favorite: page?.is_favorite || false,
  is_locked: page?.is_locked || false,
  archived_at: page?.archived_at || undefined,
  workspace: page?.workspace || undefined,
  project_ids: page?.project_ids || undefined,
  created_by: page?.created_by || undefined,
  updated_by: page?.updated_by || undefined,
  created_at: page?.created_at || undefined,
  updated_at: page?.updated_at || undefined,
  deleted_at: page?.deleted_at || undefined,
  oldName: page?.name || "",
  asJSONExtended: {},
});

/**
 * Factory function to create a base page store instance
 *
 * Each page gets its own store instance for managing its state.
 * This replaces the MobX BasePage class with a Zustand store.
 */
export const createBasePageStore = (
  rootStore: RootStore,
  page: TPage,
  services: TBasePageServices
) => {
  return create<BasePageStore>()((set, get) => ({
    ...createInitialState(page),

    // Helpers
    setIsSubmitting: (value) => {
      set({ isSubmitting: value });
    },

    setSyncingStatus: (status) => {
      set({ isSyncingWithServer: status });
    },

    // Computed getters
    getAsJSON: () => {
      const state = get();
      return {
        id: state.id,
        name: state.name,
        description: state.description,
        description_html: state.description_html,
        color: state.color,
        label_ids: state.label_ids,
        owned_by: state.owned_by,
        access: state.access,
        logo_props: state.logo_props,
        is_favorite: state.is_favorite,
        is_locked: state.is_locked,
        archived_at: state.archived_at,
        workspace: state.workspace,
        project_ids: state.project_ids,
        created_by: state.created_by,
        updated_by: state.updated_by,
        created_at: state.created_at,
        updated_at: state.updated_at,
        deleted_at: state.deleted_at,
        ...state.asJSONExtended,
      } as TPage;
    },

    getIsCurrentUserOwner: (currentUserId) => {
      if (!currentUserId) return false;
      return get().owned_by === currentUserId;
    },

    // Actions
    update: async (pageData) => {
      const currentPage = get().getAsJSON();
      try {
        // Optimistic update
        set((state) => {
          const updates: Partial<BasePageStoreState> = {};
          Object.keys(pageData).forEach((key) => {
            const currentPageKey = key as keyof TPage;
            updates[currentPageKey as keyof BasePageStoreState] = pageData[currentPageKey] as any;
          });
          return updates;
        });

        return await services.update(currentPage);
      } catch (error) {
        // Rollback on error
        set((state) => {
          const rollback: Partial<BasePageStoreState> = {};
          Object.keys(pageData).forEach((key) => {
            const currentPageKey = key as keyof TPage;
            rollback[currentPageKey as keyof BasePageStoreState] = currentPage?.[currentPageKey] as any;
          });
          return rollback;
        });
        throw error;
      }
    },

    updateTitle: (title) => {
      set((state) => ({
        oldName: state.name ?? "",
        name: title,
      }));
    },

    updateDescription: async (document) => {
      const currentDescription = get().description_html;
      set({ description_html: document.description_html });

      try {
        await services.updateDescription(document);
      } catch (error) {
        set({ description_html: currentDescription });
        throw error;
      }
    },

    makePublic: async ({ shouldSync = true }) => {
      const pageAccess = get().access;
      set({ access: EPageAccess.PUBLIC });

      if (shouldSync) {
        try {
          await services.updateAccess({ access: EPageAccess.PUBLIC });
        } catch (error) {
          set({ access: pageAccess });
          throw error;
        }
      }
    },

    makePrivate: async ({ shouldSync = true }) => {
      const pageAccess = get().access;
      set({ access: EPageAccess.PRIVATE });

      if (shouldSync) {
        try {
          await services.updateAccess({ access: EPageAccess.PRIVATE });
        } catch (error) {
          set({ access: pageAccess });
          throw error;
        }
      }
    },

    lock: async ({ shouldSync = true }) => {
      const pageIsLocked = get().is_locked;
      set({ is_locked: true });

      if (shouldSync) {
        try {
          await services.lock();
        } catch (error) {
          set({ is_locked: pageIsLocked });
          throw error;
        }
      }
    },

    unlock: async ({ shouldSync = true }) => {
      const pageIsLocked = get().is_locked;
      set({ is_locked: false });

      if (shouldSync) {
        try {
          await services.unlock();
        } catch (error) {
          set({ is_locked: pageIsLocked });
          throw error;
        }
      }
    },

    archive: async ({ shouldSync = true, archived_at }) => {
      const state = get();
      if (!state.id) return undefined;

      try {
        set({ archived_at: archived_at ?? new Date().toISOString() });

        if (useFavoriteStore.getState().entityMap[state.id]) {
          useFavoriteStore.getState().removeFavorite(state.id);
        }

        if (shouldSync) {
          const response = await services.archive();
          set({ archived_at: response.archived_at });
        }
      } catch (error) {
        console.error(error);
        set({ archived_at: null });
      }
    },

    restore: async ({ shouldSync = true }) => {
      const archivedAtBeforeRestore = get().archived_at;

      try {
        set({ archived_at: null });

        if (shouldSync) {
          await services.restore();
        }
      } catch (error) {
        console.error(error);
        set({ archived_at: archivedAtBeforeRestore });
        throw error;
      }
    },

    updatePageLogo: async (value) => {
      const originalLogoProps = { ...get().logo_props };
      try {
        let logoValue = {};
        if (value?.type === "emoji")
          logoValue = {
            value: value.value,
            url: undefined,
          };
        else if (value?.type === "icon") logoValue = value.value;

        const logoProps: TLogoProps = {
          in_use: value?.type,
          [value?.type]: logoValue,
        };

        set({ logo_props: logoProps });
        await services.update({ logo_props: logoProps });
      } catch (error) {
        console.error("Error in updating page logo", error);
        set({ logo_props: originalLogoProps as TLogoProps });
        throw error;
      }
    },

    addToFavorites: async () => {
      const state = get();
      const workspaceSlug = getRouterWorkspaceSlug();
      const projectId = state.project_ids?.[0] ?? null;
      if (!workspaceSlug || !state.id) return undefined;

      const pageIsFavorite = state.is_favorite;
      set({ is_favorite: true });

      try {
        await favoriteService.addFavorite(workspaceSlug.toString(), {
          entity_type: "page",
          entity_identifier: state.id,
          project_id: projectId,
          entity_data: { name: state.name || "" },
        });
      } catch (error) {
        set({ is_favorite: pageIsFavorite });
        throw error;
      }
    },

    removePageFromFavorites: async () => {
      const state = get();
      const workspaceSlug = getRouterWorkspaceSlug();
      if (!workspaceSlug || !state.id) return undefined;

      const pageIsFavorite = state.is_favorite;
      set({ is_favorite: false });

      try {
        await favoriteService.removeFavoriteEntity(workspaceSlug, state.id);
      } catch (error) {
        set({ is_favorite: pageIsFavorite });
        throw error;
      }
    },

    duplicate: async () => await services.duplicate(),

    mutateProperties: (data, shouldUpdateName = true) => {
      set((state) => {
        const updates: Partial<BasePageStoreState> = {};
        Object.keys(data).forEach((key) => {
          const value = data[key as keyof TPage];
          if (key === "name" && !shouldUpdateName) return;
          updates[key as keyof BasePageStoreState] = value as any;
        });
        return updates;
      });
    },
  }));
};

/**
 * Legacy interface for backward compatibility with MobX BasePage.
 * @deprecated Use TanStack Query hooks directly in React components
 */
export interface IBasePage {
  // Loaders
  isSubmitting: TNameDescriptionLoader;
  isSyncingWithServer: "syncing" | "synced" | "error";

  // Page properties
  id: string | undefined;
  name: string | undefined;
  logo_props: TLogoProps | undefined;
  description: object | undefined;
  description_html: string | undefined;
  color: string | undefined;
  label_ids: string[] | undefined;
  owned_by: string | undefined;
  access: EPageAccess | undefined;
  is_favorite: boolean;
  is_locked: boolean;
  archived_at: string | null | undefined;
  workspace: string | undefined;
  project_ids?: string[] | undefined;
  created_by: string | undefined;
  updated_by: string | undefined;
  created_at: Date | undefined;
  updated_at: Date | undefined;
  deleted_at: Date | undefined;

  // Computed
  asJSON: TPage | undefined;
  isCurrentUserOwner: boolean;

  // Helpers
  oldName: string;
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  cleanup: () => void;

  // Actions
  update: (pageData: Partial<TPage>) => Promise<Partial<TPage> | undefined>;
  updateTitle: (title: string) => void;
  updateDescription: (document: TDocumentPayload) => Promise<void>;
  makePublic: (params: { shouldSync?: boolean }) => Promise<void>;
  makePrivate: (params: { shouldSync?: boolean }) => Promise<void>;
  lock: (params: { shouldSync?: boolean; recursive?: boolean }) => Promise<void>;
  unlock: (params: { shouldSync?: boolean; recursive?: boolean }) => Promise<void>;
  archive: (params: { shouldSync?: boolean; archived_at?: string | null }) => Promise<void>;
  restore: (params: { shouldSync?: boolean }) => Promise<void>;
  updatePageLogo: (value: TChangeHandlerProps) => Promise<void>;
  addToFavorites: () => Promise<void>;
  removePageFromFavorites: () => Promise<void>;
  duplicate: () => Promise<TPage | undefined>;
  mutateProperties: (data: Partial<TPage>, shouldUpdateName?: boolean) => void;
  setSyncingStatus: (status: "syncing" | "synced" | "error") => void;

  // Sub-store
  editor: {
    editorRef: any;
    assetsList: any[];
    setEditorRef: (ref: any) => void;
    updateAssetsList: (assets: any[]) => void;
  };
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used to maintain API compatibility during migration.
 *
 * @deprecated Use TanStack Query hooks directly in React components
 */
export class BasePageStoreLegacy implements IBasePage {
  private store: StoreApi<BasePageStore>;
  private rootStore: RootStore;
  private titleUpdateTimer: NodeJS.Timeout | null = null;

  constructor(rootStore: RootStore, page: TPage, services: TBasePageServices) {
    this.rootStore = rootStore;
    this.store = createBasePageStore(rootStore, page, services);

    // Set up title auto-save similar to MobX reaction
    // Note: In a real component, this should be handled with useEffect
    let previousName = page?.name;
    this.store.subscribe((state) => {
      if (state.name !== previousName) {
        if (this.titleUpdateTimer) {
          clearTimeout(this.titleUpdateTimer);
        }

        this.titleUpdateTimer = setTimeout(() => {
          const currentName = this.store.getState().name;
          if (currentName !== previousName) {
            this.store.getState().setIsSubmitting("submitting");
            services
              .update({ name: currentName })
              .catch(() => {
                this.store.setState({ name: this.store.getState().oldName });
              })
              .finally(() => {
                this.store.getState().setIsSubmitting("submitted");
              });
            previousName = currentName;
          }
        }, 2000);
      }
    });
  }

  // Loaders
  get isSubmitting() {
    return this.store.getState().isSubmitting;
  }

  get isSyncingWithServer() {
    return this.store.getState().isSyncingWithServer;
  }

  // Page properties
  get id() {
    return this.store.getState().id;
  }

  get name() {
    return this.store.getState().name;
  }

  get logo_props() {
    return this.store.getState().logo_props;
  }

  get description() {
    return this.store.getState().description;
  }

  get description_html() {
    return this.store.getState().description_html;
  }

  get color() {
    return this.store.getState().color;
  }

  get label_ids() {
    return this.store.getState().label_ids;
  }

  get owned_by() {
    return this.store.getState().owned_by;
  }

  get access() {
    return this.store.getState().access;
  }

  get is_favorite() {
    return this.store.getState().is_favorite;
  }

  get is_locked() {
    return this.store.getState().is_locked;
  }

  get archived_at() {
    return this.store.getState().archived_at;
  }

  get workspace() {
    return this.store.getState().workspace;
  }

  get project_ids() {
    return this.store.getState().project_ids;
  }

  get created_by() {
    return this.store.getState().created_by;
  }

  get updated_by() {
    return this.store.getState().updated_by;
  }

  get created_at() {
    return this.store.getState().created_at;
  }

  get updated_at() {
    return this.store.getState().updated_at;
  }

  get deleted_at() {
    return this.store.getState().deleted_at;
  }

  // Computed
  get asJSON() {
    return this.store.getState().getAsJSON();
  }

  get isCurrentUserOwner() {
    const currentUserId = this.rootStore.user.data?.id;
    return this.store.getState().getIsCurrentUserOwner(currentUserId);
  }

  // Helpers
  get oldName() {
    return this.store.getState().oldName;
  }

  setIsSubmitting = (value: TNameDescriptionLoader) => {
    this.store.getState().setIsSubmitting(value);
  };

  cleanup = () => {
    if (this.titleUpdateTimer) {
      clearTimeout(this.titleUpdateTimer);
    }
  };

  // Actions
  update = async (pageData: Partial<TPage>) => {
    return this.store.getState().update(pageData);
  };

  updateTitle = (title: string) => {
    this.store.getState().updateTitle(title);
  };

  updateDescription = async (document: TDocumentPayload) => {
    return this.store.getState().updateDescription(document);
  };

  makePublic = async (params: { shouldSync?: boolean }) => {
    return this.store.getState().makePublic(params);
  };

  makePrivate = async (params: { shouldSync?: boolean }) => {
    return this.store.getState().makePrivate(params);
  };

  lock = async (params: { shouldSync?: boolean; recursive?: boolean }) => {
    return this.store.getState().lock(params);
  };

  unlock = async (params: { shouldSync?: boolean; recursive?: boolean }) => {
    return this.store.getState().unlock(params);
  };

  archive = async (params: { shouldSync?: boolean; archived_at?: string | null }) => {
    return this.store.getState().archive(params);
  };

  restore = async (params: { shouldSync?: boolean }) => {
    return this.store.getState().restore(params);
  };

  updatePageLogo = async (value: TChangeHandlerProps) => {
    return this.store.getState().updatePageLogo(value);
  };

  addToFavorites = async () => {
    return this.store.getState().addToFavorites();
  };

  removePageFromFavorites = async () => {
    return this.store.getState().removePageFromFavorites();
  };

  duplicate = async () => {
    return this.store.getState().duplicate();
  };

  mutateProperties = (data: Partial<TPage>, shouldUpdateName?: boolean) => {
    this.store.getState().mutateProperties(data, shouldUpdateName);
  };

  setSyncingStatus = (status: "syncing" | "synced" | "error") => {
    this.store.getState().setSyncingStatus(status);
  };

  // Sub-store (editor) - delegate to global page editor store
  get editor() {
    const editorStore = usePageEditorStore.getState();
    return {
      get editorRef() {
        return editorStore.editorRef;
      },
      get assetsList() {
        return editorStore.assetsList;
      },
      setEditorRef: editorStore.setEditorRef,
      updateAssetsList: editorStore.updateAssetsList,
    };
  }
}

// Export types for backward compatibility
export type TBasePage = IBasePage;
export type { TBasePageServices } from "@/store/pages/base-page";

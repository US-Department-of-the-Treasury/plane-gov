import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import { EPageAccess } from "@plane/constants";
import type { TChangeHandlerProps } from "@plane/propel/emoji-icon-picker";
import type { TDocumentPayload, TLogoProps, TNameDescriptionLoader, TPage } from "@plane/types";
// plane web store
import { ExtendedBasePage } from "@/plane-web/store/pages/extended-base-page";
import type { RootStore } from "@/plane-web/store/root.store";
// services
import { FavoriteService } from "@/services/favorite";
// store
import { useFavoriteStore } from "@/store/client";
// local imports
import { PageEditorInstance } from "./page-editor-info";

// Service instance at module level
const favoriteService = new FavoriteService();

export type TBasePage = TPage & {
  // observables
  isSubmitting: TNameDescriptionLoader;
  isSyncingWithServer: "syncing" | "synced" | "error";
  // computed
  asJSON: TPage | undefined;
  isCurrentUserOwner: boolean;
  // helpers
  oldName: string;
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  cleanup: () => void;
  // actions
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
  // sub-store
  editor: PageEditorInstance;
};

export type TBasePagePermissions = {
  canCurrentUserAccessPage: boolean;
  canCurrentUserEditPage: boolean;
  canCurrentUserDuplicatePage: boolean;
  canCurrentUserLockPage: boolean;
  canCurrentUserChangeAccess: boolean;
  canCurrentUserArchivePage: boolean;
  canCurrentUserDeletePage: boolean;
  canCurrentUserFavoritePage: boolean;
  canCurrentUserMovePage: boolean;
  isContentEditable: boolean;
};

export type TBasePageServices = {
  update: (payload: Partial<TPage>) => Promise<Partial<TPage>>;
  updateDescription: (document: TDocumentPayload) => Promise<void>;
  updateAccess: (payload: Pick<TPage, "access">) => Promise<void>;
  lock: () => Promise<void>;
  unlock: () => Promise<void>;
  archive: () => Promise<{
    archived_at: string;
  }>;
  restore: () => Promise<void>;
  duplicate: () => Promise<TPage>;
};

export type TPageInstance = TBasePage &
  TBasePagePermissions & {
    getRedirectionLink: () => string;
  };

// Zustand Store
interface BasePageState {
  // loaders
  isSubmitting: TNameDescriptionLoader;
  isSyncingWithServer: "syncing" | "synced" | "error";
  // page properties
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
  // helpers
  oldName: string;
}

interface BasePageActions {
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  setSyncingStatus: (status: "syncing" | "synced" | "error") => void;
  updateTitle: (title: string) => void;
  mutateProperties: (data: Partial<TPage>, shouldUpdateName?: boolean) => void;
  updateState: (updates: Partial<BasePageState>) => void;
}

type BasePageStoreType = BasePageState & BasePageActions;

const createBasePageStore = (page: TPage) =>
  create<BasePageStoreType>()(
    immer((set) => ({
      // State
      isSubmitting: "saved" as TNameDescriptionLoader,
      isSyncingWithServer: "syncing" as "syncing" | "synced" | "error",
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

      // Actions
      setIsSubmitting: (value) => {
        set((state) => {
          state.isSubmitting = value;
        });
      },

      setSyncingStatus: (status) => {
        set((state) => {
          state.isSyncingWithServer = status;
        });
      },

      updateTitle: (title) => {
        set((state) => {
          state.oldName = state.name ?? "";
          state.name = title;
        });
      },

      mutateProperties: (data, shouldUpdateName = true) => {
        set((state) => {
          Object.keys(data).forEach((key) => {
            const value = data[key as keyof TPage];
            if (key === "name" && !shouldUpdateName) return;
            lodashSet(state, key, value);
          });
        });
      },

      updateState: (updates) => {
        set((state) => {
          Object.assign(state, updates);
        });
      },
    }))
  );

export class BasePage extends ExtendedBasePage implements TBasePage {
  // services
  services: TBasePageServices;
  // reactions
  disposers: Array<() => void> = [];
  // root store
  rootStore: RootStore;
  // sub-store
  editor: PageEditorInstance;
  // zustand store
  private pageStore: ReturnType<typeof createBasePageStore>;
  private titleUpdateTimer: NodeJS.Timeout | null = null;

  constructor(
    private store: RootStore,
    page: TPage,
    services: TBasePageServices
  ) {
    super(store, page, services);

    // init
    this.services = services;
    this.rootStore = store;
    this.editor = new PageEditorInstance();
    this.pageStore = createBasePageStore(page);

    // Setup title update reaction with 2 second delay
    this.pageStore.subscribe((state, prevState) => {
      if (state.name !== prevState.name) {
        if (this.titleUpdateTimer) {
          clearTimeout(this.titleUpdateTimer);
        }
        this.titleUpdateTimer = setTimeout(() => {
          const currentName = this.pageStore.getState().name;
          const oldName = this.pageStore.getState().oldName;
          this.pageStore.getState().setIsSubmitting("submitting");
          this.services
            .update({
              name: currentName,
            })
            .catch(() => {
              this.pageStore.getState().updateState({ name: oldName });
            })
            .finally(() => {
              this.pageStore.getState().setIsSubmitting("submitted");
            });
        }, 2000);
      }
    });
  }

  // Property getters
  get isSubmitting() {
    return this.pageStore.getState().isSubmitting;
  }

  get isSyncingWithServer() {
    return this.pageStore.getState().isSyncingWithServer;
  }

  get id() {
    return this.pageStore.getState().id;
  }

  get name() {
    return this.pageStore.getState().name;
  }

  get logo_props() {
    return this.pageStore.getState().logo_props;
  }

  get description() {
    return this.pageStore.getState().description;
  }

  get description_html() {
    return this.pageStore.getState().description_html;
  }

  get color() {
    return this.pageStore.getState().color;
  }

  get label_ids() {
    return this.pageStore.getState().label_ids;
  }

  get owned_by() {
    return this.pageStore.getState().owned_by;
  }

  get access() {
    return this.pageStore.getState().access;
  }

  get is_favorite() {
    return this.pageStore.getState().is_favorite;
  }

  get is_locked() {
    return this.pageStore.getState().is_locked;
  }

  get archived_at() {
    return this.pageStore.getState().archived_at;
  }

  get workspace() {
    return this.pageStore.getState().workspace;
  }

  get project_ids() {
    return this.pageStore.getState().project_ids;
  }

  get created_by() {
    return this.pageStore.getState().created_by;
  }

  get updated_by() {
    return this.pageStore.getState().updated_by;
  }

  get created_at() {
    return this.pageStore.getState().created_at;
  }

  get updated_at() {
    return this.pageStore.getState().updated_at;
  }

  get deleted_at() {
    return this.pageStore.getState().deleted_at;
  }

  get oldName() {
    return this.pageStore.getState().oldName;
  }

  // Computed properties
  get asJSON() {
    const state = this.pageStore.getState();
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
      ...this.asJSONExtended,
    };
  }

  get isCurrentUserOwner() {
    const currentUserId = this.store.user.data?.id;
    if (!currentUserId) return false;
    return this.pageStore.getState().owned_by === currentUserId;
  }

  /**
   * @description update the submitting state
   * @param value
   */
  setIsSubmitting = (value: TNameDescriptionLoader) => {
    this.pageStore.getState().setIsSubmitting(value);
  };

  cleanup = () => {
    if (this.titleUpdateTimer) {
      clearTimeout(this.titleUpdateTimer);
    }
    this.disposers.forEach((disposer) => {
      disposer();
    });
  };

  /**
   * @description update the page
   * @param {Partial<TPage>} pageData
   */
  update = async (pageData: Partial<TPage>) => {
    const currentPage = this.asJSON;
    try {
      const updates: Partial<BasePageState> = {};
      Object.keys(pageData).forEach((key) => {
        const currentPageKey = key as keyof TPage;
        updates[currentPageKey as keyof BasePageState] = pageData[currentPageKey] as any;
      });
      this.pageStore.getState().updateState(updates);

      return await this.services.update(currentPage);
    } catch (error) {
      const rollback: Partial<BasePageState> = {};
      Object.keys(pageData).forEach((key) => {
        const currentPageKey = key as keyof TPage;
        rollback[currentPageKey as keyof BasePageState] = currentPage?.[currentPageKey] as any;
      });
      this.pageStore.getState().updateState(rollback);
      throw error;
    }
  };

  /**
   * @description update the page title
   * @param title
   */
  updateTitle = (title: string) => {
    this.pageStore.getState().updateTitle(title);
  };

  /**
   * @description update the page description
   * @param {TDocumentPayload} document
   */
  updateDescription = async (document: TDocumentPayload) => {
    const currentDescription = this.pageStore.getState().description_html;
    this.pageStore.getState().updateState({ description_html: document.description_html });

    try {
      await this.services.updateDescription(document);
    } catch (error) {
      this.pageStore.getState().updateState({ description_html: currentDescription });
      throw error;
    }
  };

  /**
   * @description make the page public
   */
  makePublic = async ({ shouldSync = true }) => {
    const pageAccess = this.pageStore.getState().access;
    this.pageStore.getState().updateState({ access: EPageAccess.PUBLIC });

    if (shouldSync) {
      try {
        await this.services.updateAccess({
          access: EPageAccess.PUBLIC,
        });
      } catch (error) {
        this.pageStore.getState().updateState({ access: pageAccess });
        throw error;
      }
    }
  };

  /**
   * @description make the page private
   */
  makePrivate = async ({ shouldSync = true }) => {
    const pageAccess = this.pageStore.getState().access;
    this.pageStore.getState().updateState({ access: EPageAccess.PRIVATE });

    if (shouldSync) {
      try {
        await this.services.updateAccess({
          access: EPageAccess.PRIVATE,
        });
      } catch (error) {
        this.pageStore.getState().updateState({ access: pageAccess });
        throw error;
      }
    }
  };

  /**
   * @description lock the page
   */
  lock = async ({ shouldSync = true }) => {
    const pageIsLocked = this.pageStore.getState().is_locked;
    this.pageStore.getState().updateState({ is_locked: true });

    if (shouldSync) {
      await this.services.lock().catch((error) => {
        this.pageStore.getState().updateState({ is_locked: pageIsLocked });
        throw error;
      });
    }
  };

  /**
   * @description unlock the page
   */
  unlock = async ({ shouldSync = true }) => {
    const pageIsLocked = this.pageStore.getState().is_locked;
    this.pageStore.getState().updateState({ is_locked: false });

    if (shouldSync) {
      await this.services.unlock().catch((error) => {
        this.pageStore.getState().updateState({ is_locked: pageIsLocked });
        throw error;
      });
    }
  };

  /**
   * @description archive the page
   */
  archive = async ({ shouldSync = true, archived_at }: { shouldSync?: boolean; archived_at?: string | null }) => {
    const pageId = this.pageStore.getState().id;
    if (!pageId) return undefined;

    try {
      this.pageStore.getState().updateState({
        archived_at: archived_at ?? new Date().toISOString()
      });

      if (useFavoriteStore.getState().entityMap[pageId]) useFavoriteStore.getState().removeFavorite(pageId);

      if (shouldSync) {
        const response = await this.services.archive();
        this.pageStore.getState().updateState({ archived_at: response.archived_at });
      }
    } catch (error) {
      console.error(error);
      this.pageStore.getState().updateState({ archived_at: null });
    }
  };

  /**
   * @description restore the page
   */
  restore = async ({ shouldSync = true }: { shouldSync?: boolean }) => {
    const archivedAtBeforeRestore = this.pageStore.getState().archived_at;

    try {
      this.pageStore.getState().updateState({ archived_at: null });

      if (shouldSync) {
        await this.services.restore();
      }
    } catch (error) {
      console.error(error);
      this.pageStore.getState().updateState({ archived_at: archivedAtBeforeRestore });
      throw error;
    }
  };

  updatePageLogo = async (value: TChangeHandlerProps) => {
    const originalLogoProps = { ...this.pageStore.getState().logo_props };
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

      this.pageStore.getState().updateState({ logo_props: logoProps });
      await this.services.update({
        logo_props: logoProps,
      });
    } catch (error) {
      console.error("Error in updating page logo", error);
      this.pageStore.getState().updateState({ logo_props: originalLogoProps as TLogoProps });
      throw error;
    }
  };

  /**
   * @description add the page to favorites
   */
  addToFavorites = async () => {
    const { workspaceSlug } = this.store.router;
    const state = this.pageStore.getState();
    const projectId = state.project_ids?.[0] ?? null;
    if (!workspaceSlug || !state.id) return undefined;

    const pageIsFavorite = state.is_favorite;
    this.pageStore.getState().updateState({ is_favorite: true });
    await favoriteService
      .addFavorite(workspaceSlug.toString(), {
        entity_type: "page",
        entity_identifier: state.id,
        project_id: projectId,
        entity_data: { name: state.name || "" },
      })
      .catch((error) => {
        this.pageStore.getState().updateState({ is_favorite: pageIsFavorite });
        throw error;
      });
  };

  /**
   * @description remove the page from favorites
   */
  removePageFromFavorites = async () => {
    const { workspaceSlug } = this.store.router;
    const pageId = this.pageStore.getState().id;
    if (!workspaceSlug || !pageId) return undefined;

    const pageIsFavorite = this.pageStore.getState().is_favorite;
    this.pageStore.getState().updateState({ is_favorite: false });

    await favoriteService.removeFavoriteEntity(workspaceSlug, pageId).catch((error) => {
      this.pageStore.getState().updateState({ is_favorite: pageIsFavorite });
      throw error;
    });
  };

  /**
   * @description duplicate the page
   */
  duplicate = async () => await this.services.duplicate();

  /**
   * @description mutate multiple properties at once
   * @param data Partial<TPage>
   */
  mutateProperties = (data: Partial<TPage>, shouldUpdateName: boolean = true) => {
    this.pageStore.getState().mutateProperties(data, shouldUpdateName);
  };

  setSyncingStatus = (status: "syncing" | "synced" | "error") => {
    this.pageStore.getState().setSyncingStatus(status);
  };
}

import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
// constants
import { EPageAccess, EUserPermissions } from "@plane/constants";
import type { TChangeHandlerProps } from "@plane/propel/emoji-icon-picker";
import type { TDocumentPayload, TLogoProps, TNameDescriptionLoader, TPage } from "@plane/types";
import type { EditorRefApi, TEditorAsset } from "@plane/editor";
// plane web store
import type { RootStore } from "@/plane-web/store/root.store";
// services
import { ProjectPageService } from "@/services/page";

// Service instances at module level
const projectPageService = new ProjectPageService();

// State interface
export interface ProjectPageInstanceStoreState {
  // Loaders
  isSubmitting: TNameDescriptionLoader;
  isSyncingWithServer: "syncing" | "synced" | "error";

  // Page properties (from BasePage)
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

  // Page editor state (from PageEditorInstance)
  editorRef: EditorRefApi | null;
  assetsList: TEditorAsset[];

  // Root store reference
  rootStore: RootStore | null;

  // Workspace and project context
  workspaceSlug: string | undefined;
  projectId: string | undefined;

  // Disposers for reactions
  disposers: Array<() => void>;
}

// Actions interface
export interface ProjectPageInstanceStoreActions {
  // Initialization
  initialize: (store: RootStore, page: TPage) => void;

  // Helpers
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  cleanup: () => void;
  setSyncingStatus: (status: "syncing" | "synced" | "error") => void;

  // Computed properties (as getter functions)
  getAsJSON: () => TPage | undefined;
  getIsCurrentUserOwner: () => boolean;
  getCanCurrentUserAccessPage: () => boolean;
  getCanCurrentUserEditPage: () => boolean;
  getCanCurrentUserDuplicatePage: () => boolean;
  getCanCurrentUserLockPage: () => boolean;
  getCanCurrentUserChangeAccess: () => boolean;
  getCanCurrentUserArchivePage: () => boolean;
  getCanCurrentUserDeletePage: () => boolean;
  getCanCurrentUserFavoritePage: () => boolean;
  getCanCurrentUserMovePage: () => boolean;
  getIsContentEditable: () => boolean;
  getRedirectionLink: () => string;

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

  // Page editor actions
  setEditorRef: (editorRef: EditorRefApi | null) => void;
  updateAssetsList: (assets: TEditorAsset[]) => void;

  // Helper for permission checks
  getHighestRoleAcrossProjects: () => EUserPermissions | undefined;
}

// Combined store type
export type ProjectPageInstanceStore = ProjectPageInstanceStoreState & ProjectPageInstanceStoreActions;

// Initial state
const initialState: ProjectPageInstanceStoreState = {
  isSubmitting: "saved",
  isSyncingWithServer: "syncing",
  id: undefined,
  name: undefined,
  logo_props: undefined,
  description: undefined,
  description_html: undefined,
  color: undefined,
  label_ids: undefined,
  owned_by: undefined,
  access: undefined,
  is_favorite: false,
  is_locked: false,
  archived_at: undefined,
  workspace: undefined,
  project_ids: undefined,
  created_by: undefined,
  updated_by: undefined,
  created_at: undefined,
  updated_at: undefined,
  deleted_at: undefined,
  oldName: "",
  editorRef: null,
  assetsList: [],
  rootStore: null,
  workspaceSlug: undefined,
  projectId: undefined,
  disposers: [],
};

// Factory function to create project page stores
export const createProjectPageInstanceStore = (store: RootStore, page: TPage) => {
  const { workspaceSlug } = store.router;
  const projectId = page.project_ids?.[0];

  return create<ProjectPageInstanceStore>()((set, get) => ({
    ...initialState,

    // Initialize state from page data
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
    rootStore: store,
    workspaceSlug: workspaceSlug,
    projectId: projectId,

    // Initialization
    initialize: (store: RootStore, page: TPage) => {
      const { workspaceSlug } = store.router;
      const projectId = page.project_ids?.[0];

      set({
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
        rootStore: store,
        workspaceSlug: workspaceSlug,
        projectId: projectId,
      });

      // Set up the title reaction
      const setupTitleReaction = () => {
        let timeoutId: NodeJS.Timeout | null = null;
        let previousName = get().name;

        const checkNameChange = () => {
          const currentName = get().name;
          if (currentName !== previousName) {
            previousName = currentName;
            if (timeoutId) clearTimeout(timeoutId);

            timeoutId = setTimeout(async () => {
              const state = get();
              set({ isSubmitting: "submitting" });

              try {
                if (!state.workspaceSlug || !state.projectId || !state.id) {
                  throw new Error("Missing required fields.");
                }

                await projectPageService.update(
                  state.workspaceSlug,
                  state.projectId,
                  state.id,
                  { name: currentName }
                );
                set({ isSubmitting: "submitted" });
              } catch (error) {
                set({
                  name: state.oldName,
                  isSubmitting: "submitted"
                });
              }
            }, 2000);
          }
        };

        const intervalId = setInterval(checkNameChange, 100);

        const disposer = () => {
          if (timeoutId) clearTimeout(timeoutId);
          clearInterval(intervalId);
        };

        set({ disposers: [...get().disposers, disposer] });
      };

      setupTitleReaction();
    },

    // Helpers
    setIsSubmitting: (value: TNameDescriptionLoader) => {
      set({ isSubmitting: value });
    },

    cleanup: () => {
      const state = get();
      state.disposers.forEach((disposer) => disposer());
      set({ disposers: [] });
    },

    setSyncingStatus: (status: "syncing" | "synced" | "error") => {
      set({ isSyncingWithServer: status });
    },

    // Helper for permission checks
    getHighestRoleAcrossProjects: () => {
      const state = get();
      const { workspaceSlug } = state.rootStore?.router || {};
      if (!workspaceSlug || !state.project_ids?.length || !state.rootStore) return undefined;

      let highestRole: EUserPermissions | undefined = undefined;
      state.project_ids.forEach((projectId) => {
        const currentUserProjectRole = state.rootStore!.user.permission.getProjectRoleByWorkspaceSlugAndProjectId(
          workspaceSlug?.toString() || "",
          projectId?.toString() || ""
        );
        if (currentUserProjectRole) {
          if (!highestRole) highestRole = currentUserProjectRole;
          else if (currentUserProjectRole > highestRole) highestRole = currentUserProjectRole;
        }
      });
      return highestRole;
    },

    // Computed properties as getter functions
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
      };
    },

    getIsCurrentUserOwner: () => {
      const state = get();
      const currentUserId = state.rootStore?.user.data?.id;
      if (!currentUserId) return false;
      return state.owned_by === currentUserId;
    },

    getCanCurrentUserAccessPage: () => {
      const state = get();
      const isPagePublic = state.access === EPageAccess.PUBLIC;
      return isPagePublic || get().getIsCurrentUserOwner();
    },

    getCanCurrentUserEditPage: () => {
      const state = get();
      const highestRole = get().getHighestRoleAcrossProjects();
      const isPagePublic = state.access === EPageAccess.PUBLIC;
      return (
        (isPagePublic && !!highestRole && highestRole >= EUserPermissions.MEMBER) ||
        (!isPagePublic && get().getIsCurrentUserOwner())
      );
    },

    getCanCurrentUserDuplicatePage: () => {
      const highestRole = get().getHighestRoleAcrossProjects();
      return !!highestRole && highestRole >= EUserPermissions.MEMBER;
    },

    getCanCurrentUserLockPage: () => {
      const highestRole = get().getHighestRoleAcrossProjects();
      return get().getIsCurrentUserOwner() || highestRole === EUserPermissions.ADMIN;
    },

    getCanCurrentUserChangeAccess: () => {
      const highestRole = get().getHighestRoleAcrossProjects();
      return get().getIsCurrentUserOwner() || highestRole === EUserPermissions.ADMIN;
    },

    getCanCurrentUserArchivePage: () => {
      const highestRole = get().getHighestRoleAcrossProjects();
      return get().getIsCurrentUserOwner() || highestRole === EUserPermissions.ADMIN;
    },

    getCanCurrentUserDeletePage: () => {
      const highestRole = get().getHighestRoleAcrossProjects();
      return get().getIsCurrentUserOwner() || highestRole === EUserPermissions.ADMIN;
    },

    getCanCurrentUserFavoritePage: () => {
      const highestRole = get().getHighestRoleAcrossProjects();
      return !!highestRole && highestRole >= EUserPermissions.MEMBER;
    },

    getCanCurrentUserMovePage: () => {
      const highestRole = get().getHighestRoleAcrossProjects();
      return get().getIsCurrentUserOwner() || highestRole === EUserPermissions.ADMIN;
    },

    getIsContentEditable: () => {
      const state = get();
      const highestRole = get().getHighestRoleAcrossProjects();
      const isOwner = get().getIsCurrentUserOwner();
      const isPublic = state.access === EPageAccess.PUBLIC;
      const isArchived = state.archived_at;
      const isLocked = state.is_locked;

      return (
        !isArchived && !isLocked && (isOwner || (isPublic && !!highestRole && highestRole >= EUserPermissions.MEMBER))
      );
    },

    getRedirectionLink: () => {
      const state = get();
      const { workspaceSlug } = state.rootStore?.router || {};
      return `/${workspaceSlug}/projects/${state.project_ids?.[0]}/pages/${state.id}`;
    },

    // Actions
    update: async (pageData: Partial<TPage>) => {
      const state = get();
      const currentPage = get().getAsJSON();

      try {
        // Optimistically update state
        const updates: Partial<ProjectPageInstanceStoreState> = {};
        Object.keys(pageData).forEach((key) => {
          const pageKey = key as keyof TPage;
          if (key in state) {
            updates[key as keyof ProjectPageInstanceStoreState] = pageData[pageKey] as any;
          }
        });
        set(updates);

        if (!state.workspaceSlug || !state.projectId || !state.id) {
          throw new Error("Missing required fields.");
        }

        return await projectPageService.update(
          state.workspaceSlug,
          state.projectId,
          state.id,
          pageData
        );
      } catch (error) {
        // Revert on error
        const reverts: Partial<ProjectPageInstanceStoreState> = {};
        Object.keys(pageData).forEach((key) => {
          const pageKey = key as keyof TPage;
          if (key in state && currentPage) {
            reverts[key as keyof ProjectPageInstanceStoreState] = currentPage[pageKey] as any;
          }
        });
        set(reverts);
        throw error;
      }
    },

    updateTitle: (title: string) => {
      const state = get();
      set({
        oldName: state.name ?? "",
        name: title
      });
    },

    updateDescription: async (document: TDocumentPayload) => {
      const state = get();
      const currentDescription = state.description_html;

      set({ description_html: document.description_html });

      try {
        if (!state.workspaceSlug || !state.projectId || !state.id) {
          throw new Error("Missing required fields.");
        }
        await projectPageService.updateDescription(
          state.workspaceSlug,
          state.projectId,
          state.id,
          document
        );
      } catch (error) {
        set({ description_html: currentDescription });
        throw error;
      }
    },

    makePublic: async ({ shouldSync = true }) => {
      const state = get();
      const pageAccess = state.access;

      set({ access: EPageAccess.PUBLIC });

      if (shouldSync) {
        try {
          if (!state.workspaceSlug || !state.projectId || !state.id) {
            throw new Error("Missing required fields.");
          }
          await projectPageService.updateAccess(
            state.workspaceSlug,
            state.projectId,
            state.id,
            { access: EPageAccess.PUBLIC }
          );
        } catch (error) {
          set({ access: pageAccess });
          throw error;
        }
      }
    },

    makePrivate: async ({ shouldSync = true }) => {
      const state = get();
      const pageAccess = state.access;

      set({ access: EPageAccess.PRIVATE });

      if (shouldSync) {
        try {
          if (!state.workspaceSlug || !state.projectId || !state.id) {
            throw new Error("Missing required fields.");
          }
          await projectPageService.updateAccess(
            state.workspaceSlug,
            state.projectId,
            state.id,
            { access: EPageAccess.PRIVATE }
          );
        } catch (error) {
          set({ access: pageAccess });
          throw error;
        }
      }
    },

    lock: async ({ shouldSync = true }) => {
      const state = get();
      const pageIsLocked = state.is_locked;

      set({ is_locked: true });

      if (shouldSync) {
        try {
          if (!state.workspaceSlug || !state.projectId || !state.id) {
            throw new Error("Missing required fields.");
          }
          await projectPageService.lock(state.workspaceSlug, state.projectId, state.id);
        } catch (error) {
          set({ is_locked: pageIsLocked });
          throw error;
        }
      }
    },

    unlock: async ({ shouldSync = true }) => {
      const state = get();
      const pageIsLocked = state.is_locked;

      set({ is_locked: false });

      if (shouldSync) {
        try {
          if (!state.workspaceSlug || !state.projectId || !state.id) {
            throw new Error("Missing required fields.");
          }
          await projectPageService.unlock(state.workspaceSlug, state.projectId, state.id);
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

        if (state.rootStore?.favorite.entityMap[state.id]) {
          state.rootStore.favorite.removeFavoriteFromStore(state.id);
        }

        if (shouldSync) {
          if (!state.workspaceSlug || !state.projectId || !state.id) {
            throw new Error("Missing required fields.");
          }
          const response = await projectPageService.archive(
            state.workspaceSlug,
            state.projectId,
            state.id
          );
          set({ archived_at: response.archived_at });
        }
      } catch (error) {
        console.error(error);
        set({ archived_at: null });
      }
    },

    restore: async ({ shouldSync = true }) => {
      const state = get();
      const archivedAtBeforeRestore = state.archived_at;

      try {
        set({ archived_at: null });

        if (shouldSync) {
          if (!state.workspaceSlug || !state.projectId || !state.id) {
            throw new Error("Missing required fields.");
          }
          await projectPageService.restore(state.workspaceSlug, state.projectId, state.id);
        }
      } catch (error) {
        console.error(error);
        set({ archived_at: archivedAtBeforeRestore });
        throw error;
      }
    },

    updatePageLogo: async (value: TChangeHandlerProps) => {
      const state = get();
      const originalLogoProps = { ...state.logo_props };

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

        if (!state.workspaceSlug || !state.projectId || !state.id) {
          throw new Error("Missing required fields.");
        }

        await projectPageService.update(
          state.workspaceSlug,
          state.projectId,
          state.id,
          { logo_props: logoProps }
        );
      } catch (error) {
        console.error("Error in updating page logo", error);
        set({ logo_props: originalLogoProps as TLogoProps });
        throw error;
      }
    },

    addToFavorites: async () => {
      const state = get();
      const { workspaceSlug } = state.rootStore?.router || {};
      const projectId = state.project_ids?.[0] ?? null;
      if (!workspaceSlug || !state.id || !state.rootStore) return undefined;

      const pageIsFavorite = state.is_favorite;
      set({ is_favorite: true });

      try {
        await state.rootStore.favorite.addFavorite(workspaceSlug.toString(), {
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
      const { workspaceSlug } = state.rootStore?.router || {};
      if (!workspaceSlug || !state.id || !state.rootStore) return undefined;

      const pageIsFavorite = state.is_favorite;
      set({ is_favorite: false });

      try {
        await state.rootStore.favorite.removeFavoriteEntity(workspaceSlug, state.id);
      } catch (error) {
        set({ is_favorite: pageIsFavorite });
        throw error;
      }
    },

    duplicate: async () => {
      const state = get();
      if (!state.workspaceSlug || !state.projectId || !state.id) {
        throw new Error("Missing required fields.");
      }
      return await projectPageService.duplicate(state.workspaceSlug, state.projectId, state.id);
    },

    mutateProperties: (data: Partial<TPage>, shouldUpdateName: boolean = true) => {
      const updates: Partial<ProjectPageInstanceStoreState> = {};
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof TPage];
        if (key === "name" && !shouldUpdateName) return;
        if (key in get()) {
          updates[key as keyof ProjectPageInstanceStoreState] = value as any;
        }
      });
      set(updates);
    },

    // Page editor actions
    setEditorRef: (editorRef: EditorRefApi | null) => {
      set({ editorRef });
    },

    updateAssetsList: (assets: TEditorAsset[]) => {
      set({ assetsList: assets });
    },
  }));
};

// Legacy interface matching original MobX interface
export interface IProjectPage extends TPage {
  // Loaders
  isSubmitting: TNameDescriptionLoader;
  isSyncingWithServer: "syncing" | "synced" | "error";
  // Helpers
  oldName: string;
  // Computed properties
  asJSON: TPage | undefined;
  isCurrentUserOwner: boolean;
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
  // Actions
  setIsSubmitting: (value: TNameDescriptionLoader) => void;
  cleanup: () => void;
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
  getRedirectionLink: () => string;
  // Editor sub-store
  editor: {
    editorRef: EditorRefApi | null;
    assetsList: TEditorAsset[];
    setEditorRef: (editorRef: EditorRefApi | null) => void;
    updateAssetsList: (assets: TEditorAsset[]) => void;
  };
}

// Legacy class wrapper for backward compatibility
export class ProjectPageInstanceStoreLegacy implements IProjectPage {
  private projectPageStore: ReturnType<typeof createProjectPageInstanceStore>;
  private rootStore: RootStore;

  constructor(store: RootStore, page: TPage) {
    this.rootStore = store;
    this.projectPageStore = createProjectPageInstanceStore(store, page);
  }

  // Getters for loaders
  get isSubmitting(): TNameDescriptionLoader {
    return this.projectPageStore.getState().isSubmitting;
  }

  get isSyncingWithServer(): "syncing" | "synced" | "error" {
    return this.projectPageStore.getState().isSyncingWithServer;
  }

  // Getters for page properties
  get id(): string | undefined {
    return this.projectPageStore.getState().id;
  }

  get name(): string | undefined {
    return this.projectPageStore.getState().name;
  }

  get logo_props(): TLogoProps | undefined {
    return this.projectPageStore.getState().logo_props;
  }

  get description(): object | undefined {
    return this.projectPageStore.getState().description;
  }

  get description_html(): string | undefined {
    return this.projectPageStore.getState().description_html;
  }

  get color(): string | undefined {
    return this.projectPageStore.getState().color;
  }

  get label_ids(): string[] | undefined {
    return this.projectPageStore.getState().label_ids;
  }

  get owned_by(): string | undefined {
    return this.projectPageStore.getState().owned_by;
  }

  get access(): EPageAccess | undefined {
    return this.projectPageStore.getState().access;
  }

  get is_favorite(): boolean {
    return this.projectPageStore.getState().is_favorite;
  }

  get is_locked(): boolean {
    return this.projectPageStore.getState().is_locked;
  }

  get archived_at(): string | null | undefined {
    return this.projectPageStore.getState().archived_at;
  }

  get workspace(): string | undefined {
    return this.projectPageStore.getState().workspace;
  }

  get project_ids(): string[] | undefined {
    return this.projectPageStore.getState().project_ids;
  }

  get created_by(): string | undefined {
    return this.projectPageStore.getState().created_by;
  }

  get updated_by(): string | undefined {
    return this.projectPageStore.getState().updated_by;
  }

  get created_at(): Date | undefined {
    return this.projectPageStore.getState().created_at;
  }

  get updated_at(): Date | undefined {
    return this.projectPageStore.getState().updated_at;
  }

  get deleted_at(): Date | undefined {
    return this.projectPageStore.getState().deleted_at;
  }

  // Helpers
  get oldName(): string {
    return this.projectPageStore.getState().oldName;
  }

  // Computed properties
  get asJSON(): TPage | undefined {
    return this.projectPageStore.getState().getAsJSON();
  }

  get isCurrentUserOwner(): boolean {
    return this.projectPageStore.getState().getIsCurrentUserOwner();
  }

  get canCurrentUserAccessPage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserAccessPage();
  }

  get canCurrentUserEditPage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserEditPage();
  }

  get canCurrentUserDuplicatePage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserDuplicatePage();
  }

  get canCurrentUserLockPage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserLockPage();
  }

  get canCurrentUserChangeAccess(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserChangeAccess();
  }

  get canCurrentUserArchivePage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserArchivePage();
  }

  get canCurrentUserDeletePage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserDeletePage();
  }

  get canCurrentUserFavoritePage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserFavoritePage();
  }

  get canCurrentUserMovePage(): boolean {
    return this.projectPageStore.getState().getCanCurrentUserMovePage();
  }

  get isContentEditable(): boolean {
    return this.projectPageStore.getState().getIsContentEditable();
  }

  // Action methods
  setIsSubmitting = (value: TNameDescriptionLoader): void => {
    this.projectPageStore.getState().setIsSubmitting(value);
  };

  cleanup = (): void => {
    this.projectPageStore.getState().cleanup();
  };

  update = async (pageData: Partial<TPage>): Promise<Partial<TPage> | undefined> => {
    return this.projectPageStore.getState().update(pageData);
  };

  updateTitle = (title: string): void => {
    this.projectPageStore.getState().updateTitle(title);
  };

  updateDescription = async (document: TDocumentPayload): Promise<void> => {
    return this.projectPageStore.getState().updateDescription(document);
  };

  makePublic = async (params: { shouldSync?: boolean }): Promise<void> => {
    return this.projectPageStore.getState().makePublic(params);
  };

  makePrivate = async (params: { shouldSync?: boolean }): Promise<void> => {
    return this.projectPageStore.getState().makePrivate(params);
  };

  lock = async (params: { shouldSync?: boolean; recursive?: boolean }): Promise<void> => {
    return this.projectPageStore.getState().lock(params);
  };

  unlock = async (params: { shouldSync?: boolean; recursive?: boolean }): Promise<void> => {
    return this.projectPageStore.getState().unlock(params);
  };

  archive = async (params: { shouldSync?: boolean; archived_at?: string | null }): Promise<void> => {
    return this.projectPageStore.getState().archive(params);
  };

  restore = async (params: { shouldSync?: boolean }): Promise<void> => {
    return this.projectPageStore.getState().restore(params);
  };

  updatePageLogo = async (value: TChangeHandlerProps): Promise<void> => {
    return this.projectPageStore.getState().updatePageLogo(value);
  };

  addToFavorites = async (): Promise<void> => {
    return this.projectPageStore.getState().addToFavorites();
  };

  removePageFromFavorites = async (): Promise<void> => {
    return this.projectPageStore.getState().removePageFromFavorites();
  };

  duplicate = async (): Promise<TPage | undefined> => {
    return this.projectPageStore.getState().duplicate();
  };

  mutateProperties = (data: Partial<TPage>, shouldUpdateName?: boolean): void => {
    this.projectPageStore.getState().mutateProperties(data, shouldUpdateName);
  };

  setSyncingStatus = (status: "syncing" | "synced" | "error"): void => {
    this.projectPageStore.getState().setSyncingStatus(status);
  };

  getRedirectionLink = (): string => {
    return this.projectPageStore.getState().getRedirectionLink();
  };

  // Editor sub-store
  get editor() {
    const state = this.projectPageStore.getState();
    return {
      get editorRef() {
        return state.editorRef;
      },
      get assetsList() {
        return state.assetsList;
      },
      setEditorRef: (editorRef: EditorRefApi | null) => {
        state.setEditorRef(editorRef);
      },
      updateAssetsList: (assets: TEditorAsset[]) => {
        state.updateAssetsList(assets);
      },
    };
  }
}

// Export the legacy class as ProjectPage for backward compatibility
export { ProjectPageInstanceStoreLegacy as ProjectPage };

// Export types
export type TProjectPage = IProjectPage;

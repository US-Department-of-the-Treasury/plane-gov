import { create } from "zustand";
import type { TCreateModalStoreTypes, TCreatePageModal } from "@plane/constants";
import { DEFAULT_CREATE_PAGE_MODAL_DATA, EPageAccess } from "@plane/constants";
import { EIssuesStoreType } from "@plane/types";

interface CommandPaletteState {
  // Modal states
  isCreateProjectModalOpen: boolean;
  isCreateSprintModalOpen: boolean;
  isCreateEpicModalOpen: boolean;
  isCreateViewModalOpen: boolean;
  createPageModal: TCreatePageModal;
  isCreateIssueModalOpen: boolean;
  isDeleteIssueModalOpen: boolean;
  isBulkDeleteIssueModalOpen: boolean;
  createIssueStoreType: TCreateModalStoreTypes;
  createWorkItemAllowedProjectIds: string[] | undefined;
  allStickiesModal: boolean;
  projectListOpenMap: Record<string, boolean>;
  // Power-K shortcuts modal (moved from powerK store)
  isShortcutsListModalOpen: boolean;
}

interface CommandPaletteActions {
  // Computed
  isAnyModalOpen: () => boolean;
  getIsProjectListOpen: (projectId: string) => boolean;
  // Toggle actions
  toggleCreateProjectModal: (value?: boolean) => void;
  toggleCreateSprintModal: (value?: boolean) => void;
  toggleCreateViewModal: (value?: boolean) => void;
  toggleCreatePageModal: (value?: TCreatePageModal) => void;
  toggleCreateIssueModal: (
    value?: boolean,
    storeType?: TCreateModalStoreTypes,
    allowedProjectIds?: string[]
  ) => void;
  toggleCreateEpicModal: (value?: boolean) => void;
  toggleDeleteIssueModal: (value?: boolean) => void;
  toggleBulkDeleteIssueModal: (value?: boolean) => void;
  toggleAllStickiesModal: (value?: boolean) => void;
  toggleProjectListOpen: (projectId: string, value?: boolean) => void;
  toggleShortcutsListModal: (value?: boolean) => void;
}

export type CommandPaletteStore = CommandPaletteState & CommandPaletteActions;

// Legacy interface for backward compatibility with MobX store
export interface ICommandPaletteStore {
  // observables
  isCreateProjectModalOpen: boolean;
  isCreateSprintModalOpen: boolean;
  isCreateEpicModalOpen: boolean;
  isCreateViewModalOpen: boolean;
  createPageModal: TCreatePageModal;
  isCreateIssueModalOpen: boolean;
  isDeleteIssueModalOpen: boolean;
  isBulkDeleteIssueModalOpen: boolean;
  createIssueStoreType: TCreateModalStoreTypes;
  createWorkItemAllowedProjectIds: string[] | undefined;
  allStickiesModal: boolean;
  projectListOpenMap: Record<string, boolean>;
  isShortcutsListModalOpen: boolean;
  // computed
  isAnyModalOpen: boolean;
  // methods
  getIsProjectListOpen: (projectId: string) => boolean;
  toggleCreateProjectModal: (value?: boolean) => void;
  toggleCreateSprintModal: (value?: boolean) => void;
  toggleCreateViewModal: (value?: boolean) => void;
  toggleCreatePageModal: (value?: TCreatePageModal) => void;
  toggleCreateIssueModal: (
    value?: boolean,
    storeType?: TCreateModalStoreTypes,
    allowedProjectIds?: string[]
  ) => void;
  toggleCreateEpicModal: (value?: boolean) => void;
  toggleDeleteIssueModal: (value?: boolean) => void;
  toggleBulkDeleteIssueModal: (value?: boolean) => void;
  toggleAllStickiesModal: (value?: boolean) => void;
  toggleProjectListOpen: (projectId: string, value?: boolean) => void;
  toggleShortcutsListModal: (value?: boolean) => void;
}

const initialState: CommandPaletteState = {
  isCreateProjectModalOpen: false,
  isCreateSprintModalOpen: false,
  isCreateEpicModalOpen: false,
  isCreateViewModalOpen: false,
  createPageModal: DEFAULT_CREATE_PAGE_MODAL_DATA,
  isCreateIssueModalOpen: false,
  isDeleteIssueModalOpen: false,
  isBulkDeleteIssueModalOpen: false,
  createIssueStoreType: EIssuesStoreType.PROJECT,
  createWorkItemAllowedProjectIds: undefined,
  allStickiesModal: false,
  projectListOpenMap: {},
  isShortcutsListModalOpen: false,
};

export const useCommandPaletteStore = create<CommandPaletteStore>()((set, get) => ({
  ...initialState,

  // Computed
  isAnyModalOpen: () => {
    const state = get();
    return Boolean(
      state.isCreateIssueModalOpen ||
        state.isCreateSprintModalOpen ||
        state.isCreateProjectModalOpen ||
        state.isCreateEpicModalOpen ||
        state.isCreateViewModalOpen ||
        state.isShortcutsListModalOpen ||
        state.isBulkDeleteIssueModalOpen ||
        state.isDeleteIssueModalOpen ||
        state.createPageModal.isOpen ||
        state.allStickiesModal
    );
  },

  getIsProjectListOpen: (projectId: string) => get().projectListOpenMap[projectId] ?? false,

  // Toggle actions
  toggleCreateProjectModal: (value) =>
    set((state) => ({
      isCreateProjectModalOpen: value ?? !state.isCreateProjectModalOpen,
    })),

  toggleCreateSprintModal: (value) =>
    set((state) => ({
      isCreateSprintModalOpen: value ?? !state.isCreateSprintModalOpen,
    })),

  toggleCreateViewModal: (value) =>
    set((state) => ({
      isCreateViewModalOpen: value ?? !state.isCreateViewModalOpen,
    })),

  toggleCreatePageModal: (value) =>
    set((state) => {
      if (value) {
        return {
          createPageModal: {
            isOpen: value.isOpen,
            pageAccess: value.pageAccess || EPageAccess.PUBLIC,
          },
        };
      }
      return {
        createPageModal: {
          isOpen: !state.createPageModal.isOpen,
          pageAccess: EPageAccess.PUBLIC,
        },
      };
    }),

  toggleCreateIssueModal: (value, storeType, allowedProjectIds) =>
    set((state) => {
      if (value !== undefined) {
        return {
          isCreateIssueModalOpen: value,
          createIssueStoreType: storeType || EIssuesStoreType.PROJECT,
          createWorkItemAllowedProjectIds: allowedProjectIds ?? undefined,
        };
      }
      return {
        isCreateIssueModalOpen: !state.isCreateIssueModalOpen,
        createIssueStoreType: EIssuesStoreType.PROJECT,
        createWorkItemAllowedProjectIds: undefined,
      };
    }),

  toggleCreateEpicModal: (value) =>
    set((state) => ({
      isCreateEpicModalOpen: value ?? !state.isCreateEpicModalOpen,
    })),

  toggleDeleteIssueModal: (value) =>
    set((state) => ({
      isDeleteIssueModalOpen: value ?? !state.isDeleteIssueModalOpen,
    })),

  toggleBulkDeleteIssueModal: (value) =>
    set((state) => ({
      isBulkDeleteIssueModalOpen: value ?? !state.isBulkDeleteIssueModalOpen,
    })),

  toggleAllStickiesModal: (value) =>
    set((state) => ({
      allStickiesModal: value ?? !state.allStickiesModal,
    })),

  toggleProjectListOpen: (projectId, value) =>
    set((state) => ({
      projectListOpenMap: {
        ...state.projectListOpenMap,
        [projectId]: value ?? !state.projectListOpenMap[projectId],
      },
    })),

  toggleShortcutsListModal: (value) =>
    set((state) => ({
      isShortcutsListModalOpen: value ?? !state.isShortcutsListModalOpen,
    })),
}));

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useCommandPaletteStore hook directly in React components
 */
export class CommandPaletteStoreLegacy implements ICommandPaletteStore {
  get isCreateProjectModalOpen() {
    return useCommandPaletteStore.getState().isCreateProjectModalOpen;
  }
  get isCreateSprintModalOpen() {
    return useCommandPaletteStore.getState().isCreateSprintModalOpen;
  }
  get isCreateEpicModalOpen() {
    return useCommandPaletteStore.getState().isCreateEpicModalOpen;
  }
  get isCreateViewModalOpen() {
    return useCommandPaletteStore.getState().isCreateViewModalOpen;
  }
  get createPageModal() {
    return useCommandPaletteStore.getState().createPageModal;
  }
  get isCreateIssueModalOpen() {
    return useCommandPaletteStore.getState().isCreateIssueModalOpen;
  }
  get isDeleteIssueModalOpen() {
    return useCommandPaletteStore.getState().isDeleteIssueModalOpen;
  }
  get isBulkDeleteIssueModalOpen() {
    return useCommandPaletteStore.getState().isBulkDeleteIssueModalOpen;
  }
  get createIssueStoreType() {
    return useCommandPaletteStore.getState().createIssueStoreType;
  }
  get createWorkItemAllowedProjectIds() {
    return useCommandPaletteStore.getState().createWorkItemAllowedProjectIds;
  }
  get allStickiesModal() {
    return useCommandPaletteStore.getState().allStickiesModal;
  }
  get projectListOpenMap() {
    return useCommandPaletteStore.getState().projectListOpenMap;
  }
  get isShortcutsListModalOpen() {
    return useCommandPaletteStore.getState().isShortcutsListModalOpen;
  }
  get isAnyModalOpen() {
    return useCommandPaletteStore.getState().isAnyModalOpen();
  }

  getIsProjectListOpen = (projectId: string) =>
    useCommandPaletteStore.getState().getIsProjectListOpen(projectId);

  toggleCreateProjectModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleCreateProjectModal(value);

  toggleCreateSprintModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleCreateSprintModal(value);

  toggleCreateViewModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleCreateViewModal(value);

  toggleCreatePageModal = (value?: TCreatePageModal) =>
    useCommandPaletteStore.getState().toggleCreatePageModal(value);

  toggleCreateIssueModal = (
    value?: boolean,
    storeType?: TCreateModalStoreTypes,
    allowedProjectIds?: string[]
  ) => useCommandPaletteStore.getState().toggleCreateIssueModal(value, storeType, allowedProjectIds);

  toggleCreateEpicModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleCreateEpicModal(value);

  toggleDeleteIssueModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleDeleteIssueModal(value);

  toggleBulkDeleteIssueModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleBulkDeleteIssueModal(value);

  toggleAllStickiesModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleAllStickiesModal(value);

  toggleProjectListOpen = (projectId: string, value?: boolean) =>
    useCommandPaletteStore.getState().toggleProjectListOpen(projectId, value);

  toggleShortcutsListModal = (value?: boolean) =>
    useCommandPaletteStore.getState().toggleShortcutsListModal(value);
}

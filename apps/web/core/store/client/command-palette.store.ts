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
        state.createPageModal.isOpen
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

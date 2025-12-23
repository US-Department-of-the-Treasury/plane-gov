import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { DRAG_ALLOWED_GROUPS } from "@plane/constants";
// types
import type { TIssueGroupByOptions } from "@plane/types";
// constants
// store
import type { IssueRootStore } from "./root.store";

export interface IIssueKanBanViewStore {
  kanBanToggle: {
    groupByHeaderMinMax: string[];
    subgroupByIssuesVisibility: string[];
  };
  isDragging: boolean;
  // computed
  getCanUserDragDrop: (
    group_by: TIssueGroupByOptions | undefined,
    sub_group_by: TIssueGroupByOptions | undefined
  ) => boolean;
  canUserDragDropVertically: boolean;
  canUserDragDropHorizontally: boolean;
  // actions
  handleKanBanToggle: (toggle: "groupByHeaderMinMax" | "subgroupByIssuesVisibility", value: string) => void;
  setIsDragging: (isDragging: boolean) => void;
}

// Zustand Store
interface KanbanState {
  kanBanToggle: {
    groupByHeaderMinMax: string[];
    subgroupByIssuesVisibility: string[];
  };
  isDragging: boolean;
  rootStore: IssueRootStore | null;
}

interface KanbanActions {
  setRootStore: (rootStore: IssueRootStore) => void;
  handleKanBanToggle: (toggle: "groupByHeaderMinMax" | "subgroupByIssuesVisibility", value: string) => void;
  setIsDragging: (isDragging: boolean) => void;
}

type KanbanStoreType = KanbanState & KanbanActions;

export const useKanbanStore = create<KanbanStoreType>()(
  immer((set) => ({
    // State
    kanBanToggle: {
      groupByHeaderMinMax: [],
      subgroupByIssuesVisibility: [],
    },
    isDragging: false,
    rootStore: null,

    // Actions
    setRootStore: (rootStore) => {
      set((state) => {
        state.rootStore = rootStore;
      });
    },

    setIsDragging: (isDragging) => {
      set((state) => {
        state.isDragging = isDragging;
      });
    },

    handleKanBanToggle: (toggle, value) => {
      set((state) => {
        const currentToggle = state.kanBanToggle[toggle];
        state.kanBanToggle[toggle] = currentToggle.includes(value)
          ? currentToggle.filter((v) => v !== value)
          : [...currentToggle, value];
      });
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class IssueKanBanViewStore implements IIssueKanBanViewStore {
  private rootStoreRef: IssueRootStore;

  constructor(_rootStore: IssueRootStore) {
    this.rootStoreRef = _rootStore;
    const store = useKanbanStore.getState();
    store.setRootStore(_rootStore);
  }

  private get store() {
    return useKanbanStore.getState();
  }

  get kanBanToggle() {
    return this.store.kanBanToggle;
  }

  get isDragging() {
    return this.store.isDragging;
  }

  get rootStore() {
    return this.rootStoreRef;
  }

  getCanUserDragDrop = (
    group_by: TIssueGroupByOptions | undefined,
    sub_group_by: TIssueGroupByOptions | undefined
  ): boolean => {
    if (group_by && DRAG_ALLOWED_GROUPS.includes(group_by)) {
      if (!sub_group_by) return true;
      if (sub_group_by && DRAG_ALLOWED_GROUPS.includes(sub_group_by)) return true;
    }
    return false;
  };

  get canUserDragDropVertically() {
    return false;
  }

  get canUserDragDropHorizontally() {
    return false;
  }

  handleKanBanToggle = (toggle: "groupByHeaderMinMax" | "subgroupByIssuesVisibility", value: string) =>
    this.store.handleKanBanToggle(toggle, value);

  setIsDragging = (isDragging: boolean) => this.store.setIsDragging(isDragging);
}

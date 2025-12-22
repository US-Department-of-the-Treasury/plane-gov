import { create } from "zustand";
import { DRAG_ALLOWED_GROUPS } from "@plane/constants";
import type { TIssueGroupByOptions } from "@plane/types";

interface KanbanViewState {
  kanBanToggle: {
    groupByHeaderMinMax: string[];
    subgroupByIssuesVisibility: string[];
  };
  isDragging: boolean;
}

interface KanbanViewActions {
  // Computed getters
  getCanUserDragDrop: (
    group_by: TIssueGroupByOptions | undefined,
    sub_group_by: TIssueGroupByOptions | undefined
  ) => boolean;
  getCanUserDragDropVertically: () => boolean;
  getCanUserDragDropHorizontally: () => boolean;
  // Actions
  handleKanBanToggle: (toggle: "groupByHeaderMinMax" | "subgroupByIssuesVisibility", value: string) => void;
  setIsDragging: (isDragging: boolean) => void;
}

export type KanbanViewStore = KanbanViewState & KanbanViewActions;

const initialState: KanbanViewState = {
  kanBanToggle: {
    groupByHeaderMinMax: [],
    subgroupByIssuesVisibility: [],
  },
  isDragging: false,
};

export const useKanbanViewStore = create<KanbanViewStore>()((set, get) => ({
  ...initialState,

  // Computed getters
  getCanUserDragDrop: (group_by, sub_group_by) => {
    if (group_by && DRAG_ALLOWED_GROUPS.includes(group_by)) {
      if (!sub_group_by) return true;
      if (sub_group_by && DRAG_ALLOWED_GROUPS.includes(sub_group_by)) return true;
    }
    return false;
  },

  getCanUserDragDropVertically: () => false,

  getCanUserDragDropHorizontally: () => false,

  // Actions
  handleKanBanToggle: (toggle, value) => {
    set((state) => {
      const currentValues = state.kanBanToggle[toggle];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      return {
        kanBanToggle: {
          ...state.kanBanToggle,
          [toggle]: newValues,
        },
      };
    });
  },

  setIsDragging: (isDragging) => {
    set({ isDragging });
  },
}));

import { create } from "zustand";

/**
 * Zustand store for sticky UI state (client-side only).
 * Replaces UI-related state from MobX StickyStore.
 *
 * Server data (stickies, workspaceStickies) is managed by TanStack Query hooks.
 * This store only manages:
 * - searchQuery (search filter)
 * - activeStickyId (currently selected sticky)
 * - showAddNewSticky (add sticky form visibility)
 */

interface StickyUIState {
  // State
  searchQuery: string;
  activeStickyId: string | undefined;
  showAddNewSticky: boolean;
}

interface StickyUIActions {
  // Actions
  setSearchQuery: (query: string) => void;
  setActiveStickyId: (id: string | undefined) => void;
  toggleAddNewSticky: (show?: boolean) => void;
  resetStickyUI: () => void;
}

export type StickyUIStore = StickyUIState & StickyUIActions;

const initialState: StickyUIState = {
  searchQuery: "",
  activeStickyId: undefined,
  showAddNewSticky: false,
};

export const useStickyUIStore = create<StickyUIStore>()((set) => ({
  ...initialState,

  setSearchQuery: (query) =>
    set(() => ({
      searchQuery: query,
    })),

  setActiveStickyId: (id) =>
    set(() => ({
      activeStickyId: id,
    })),

  toggleAddNewSticky: (show) =>
    set((state) => ({
      showAddNewSticky: show ?? !state.showAddNewSticky,
    })),

  resetStickyUI: () => set(() => initialState),
}));

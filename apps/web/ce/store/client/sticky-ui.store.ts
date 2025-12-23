import { create } from "zustand";

/**
 * Sticky UI State Store
 *
 * Manages UI-only state for the stickies feature.
 * Migrated from MobX StickyStore to Zustand.
 *
 * This store handles:
 * - Search query filtering
 * - Active sticky selection
 * - Add new sticky modal visibility
 *
 * Server data (CRUD operations) are handled by TanStack Query hooks in @/store/queries/sticky
 */

// State interface
interface StickyUIStoreState {
  // UI state
  searchQuery: string;
  activeStickyId: string | undefined;
  showAddNewSticky: boolean;
}

// Actions interface
interface StickyUIStoreActions {
  // Search actions
  setSearchQuery: (query: string) => void;

  // Active sticky actions
  setActiveStickyId: (id: string | undefined) => void;

  // Add new sticky modal actions
  toggleAddNewSticky: (show: boolean) => void;

  // Reset state
  reset: () => void;
}

// Combined type
export type StickyUIStore = StickyUIStoreState & StickyUIStoreActions;

// Initial state
const initialState: StickyUIStoreState = {
  searchQuery: "",
  activeStickyId: undefined,
  showAddNewSticky: false,
};

/**
 * Zustand store for sticky UI state.
 *
 * Usage example:
 * ```tsx
 * const { searchQuery, setSearchQuery } = useStickyUIStore();
 * const activeStickyId = useStickyUIStore((state) => state.activeStickyId);
 * ```
 */
export const useStickyUIStore = create<StickyUIStore>()((set) => ({
  ...initialState,

  // Search actions
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Active sticky actions
  setActiveStickyId: (id) => {
    set({ activeStickyId: id });
  },

  // Add new sticky modal actions
  toggleAddNewSticky: (show) => {
    set({ showAddNewSticky: show });
  },

  // Reset state
  reset: () => {
    set(initialState);
  },
}));

// Legacy interface (matches original MobX interface for UI state only)
export interface IStickyUIStore {
  searchQuery: string;
  activeStickyId: string | undefined;
  showAddNewSticky: boolean;
  updateSearchQuery: (query: string) => void;
  updateActiveStickyId: (id: string | undefined) => void;
  toggleShowNewSticky: (value: boolean) => void;
}

/**
 * Legacy class wrapper for backward compatibility.
 * Delegates to useStickyUIStore.getState()
 *
 * @deprecated Use useStickyUIStore hook directly in components
 */
export class StickyUIStoreLegacy implements IStickyUIStore {
  get searchQuery(): string {
    return useStickyUIStore.getState().searchQuery;
  }

  get activeStickyId(): string | undefined {
    return useStickyUIStore.getState().activeStickyId;
  }

  get showAddNewSticky(): boolean {
    return useStickyUIStore.getState().showAddNewSticky;
  }

  updateSearchQuery = (query: string): void => {
    useStickyUIStore.getState().setSearchQuery(query);
  };

  updateActiveStickyId = (id: string | undefined): void => {
    useStickyUIStore.getState().setActiveStickyId(id);
  };

  toggleShowNewSticky = (value: boolean): void => {
    useStickyUIStore.getState().toggleAddNewSticky(value);
  };
}

import { create } from "zustand";
import type { EIssuesStoreType } from "@plane/types";
import type { IPowerKCommandRegistry } from "@/components/power-k/core/registry";
import { PowerKCommandRegistry } from "@/components/power-k/core/registry";
import type { TPowerKContextType, TPowerKPageType } from "@/components/power-k/core/types";

export interface ModalData {
  store: EIssuesStoreType;
  viewId: string;
}

interface PowerKState {
  isPowerKModalOpen: boolean;
  isShortcutsListModalOpen: boolean;
  commandRegistry: IPowerKCommandRegistry;
  activeContext: TPowerKContextType | null;
  activePage: TPowerKPageType | null;
  topNavInputRef: React.RefObject<HTMLInputElement> | null;
  topNavSearchInputRef: React.RefObject<HTMLInputElement> | null;
}

interface PowerKActions {
  setActiveContext: (entity: TPowerKContextType | null) => void;
  setActivePage: (page: TPowerKPageType | null) => void;
  setTopNavInputRef: (ref: React.RefObject<HTMLInputElement> | null) => void;
  setTopNavSearchInputRef: (ref: React.RefObject<HTMLInputElement> | null) => void;
  togglePowerKModal: (value?: boolean) => void;
  toggleShortcutsListModal: (value?: boolean) => void;
}

export type PowerKStore = PowerKState & PowerKActions;

const initialState: PowerKState = {
  isPowerKModalOpen: false,
  isShortcutsListModalOpen: false,
  commandRegistry: new PowerKCommandRegistry(),
  activeContext: null,
  activePage: null,
  topNavInputRef: null,
  topNavSearchInputRef: null,
};

export const usePowerKStore = create<PowerKStore>()((set, get) => ({
  ...initialState,

  // Actions
  setActiveContext: (entity) => {
    set({ activeContext: entity });
  },

  setActivePage: (page) => {
    set({ activePage: page });
  },

  setTopNavInputRef: (ref) => {
    set({ topNavInputRef: ref });
  },

  setTopNavSearchInputRef: (ref) => {
    set({ topNavSearchInputRef: ref });
  },

  togglePowerKModal: (value) => {
    set((state) => ({
      isPowerKModalOpen: value !== undefined ? value : !state.isPowerKModalOpen,
    }));
  },

  toggleShortcutsListModal: (value) => {
    set((state) => ({
      isShortcutsListModalOpen: value !== undefined ? value : !state.isShortcutsListModalOpen,
    }));
  },
}));

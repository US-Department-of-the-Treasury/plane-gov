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
  topNavInputRef: React.RefObject<HTMLInputElement | null> | null;
  topNavSearchInputRef: React.RefObject<HTMLInputElement | null> | null;
}

interface PowerKActions {
  setActiveContext: (entity: TPowerKContextType | null) => void;
  setActivePage: (page: TPowerKPageType | null) => void;
  setTopNavInputRef: (ref: React.RefObject<HTMLInputElement | null> | null) => void;
  setTopNavSearchInputRef: (ref: React.RefObject<HTMLInputElement | null> | null) => void;
  togglePowerKModal: (value?: boolean) => void;
  toggleShortcutsListModal: (value?: boolean) => void;
}

export type PowerKStore = PowerKState & PowerKActions;

// Legacy interface for backward compatibility with MobX store
export interface IPowerKStore {
  isPowerKModalOpen: boolean;
  isShortcutsListModalOpen: boolean;
  commandRegistry: IPowerKCommandRegistry;
  activeContext: TPowerKContextType | null;
  activePage: TPowerKPageType | null;
  topNavInputRef: React.RefObject<HTMLInputElement | null> | null;
  topNavSearchInputRef: React.RefObject<HTMLInputElement | null> | null;
  setActiveContext: (entity: TPowerKContextType | null) => void;
  setActivePage: (page: TPowerKPageType | null) => void;
  setTopNavInputRef: (ref: React.RefObject<HTMLInputElement | null> | null) => void;
  setTopNavSearchInputRef: (ref: React.RefObject<HTMLInputElement | null> | null) => void;
  togglePowerKModal: (value?: boolean) => void;
  toggleShortcutsListModal: (value?: boolean) => void;
}

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

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use usePowerKStore hook directly in React components
 */
export class PowerKStoreLegacy implements IPowerKStore {
  get isPowerKModalOpen() {
    return usePowerKStore.getState().isPowerKModalOpen;
  }
  get isShortcutsListModalOpen() {
    return usePowerKStore.getState().isShortcutsListModalOpen;
  }
  get commandRegistry() {
    return usePowerKStore.getState().commandRegistry;
  }
  get activeContext() {
    return usePowerKStore.getState().activeContext;
  }
  get activePage() {
    return usePowerKStore.getState().activePage;
  }
  get topNavInputRef() {
    return usePowerKStore.getState().topNavInputRef;
  }
  get topNavSearchInputRef() {
    return usePowerKStore.getState().topNavSearchInputRef;
  }

  setActiveContext = (entity: TPowerKContextType | null) =>
    usePowerKStore.getState().setActiveContext(entity);

  setActivePage = (page: TPowerKPageType | null) =>
    usePowerKStore.getState().setActivePage(page);

  setTopNavInputRef = (ref: React.RefObject<HTMLInputElement | null> | null) =>
    usePowerKStore.getState().setTopNavInputRef(ref);

  setTopNavSearchInputRef = (ref: React.RefObject<HTMLInputElement | null> | null) =>
    usePowerKStore.getState().setTopNavSearchInputRef(ref);

  togglePowerKModal = (value?: boolean) =>
    usePowerKStore.getState().togglePowerKModal(value);

  toggleShortcutsListModal = (value?: boolean) =>
    usePowerKStore.getState().toggleShortcutsListModal(value);
}

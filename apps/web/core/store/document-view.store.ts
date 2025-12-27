import { create } from "zustand";

type ViewMode = "grid" | "list";

interface DocumentViewStore {
  // List view mode (grid/list)
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  // Properties sidebar state
  isPropertiesSidebarOpen: boolean;
  togglePropertiesSidebar: () => void;
  setPropertiesSidebarOpen: (open: boolean) => void;
}

export const useDocumentViewStore = create<DocumentViewStore>((set) => ({
  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),
  isPropertiesSidebarOpen: false,
  togglePropertiesSidebar: () => set((state) => ({ isPropertiesSidebarOpen: !state.isPropertiesSidebarOpen })),
  setPropertiesSidebarOpen: (open) => set({ isPropertiesSidebarOpen: open }),
}));

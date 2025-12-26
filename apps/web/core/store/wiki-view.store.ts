import { create } from "zustand";

type ViewMode = "grid" | "list";

interface WikiViewStore {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useWikiViewStore = create<WikiViewStore>((set) => ({
  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),
}));

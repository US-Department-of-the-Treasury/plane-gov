// Re-export the Zustand store hook
import { useCommandPaletteStore } from "@/store/client";
import type { CommandPaletteStore } from "@/store/client";

// Export with original name for compatibility
export const useCommandPalette = (): CommandPaletteStore => {
  return useCommandPaletteStore();
};

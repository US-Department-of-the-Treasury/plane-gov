// Re-export from the Zustand store in client folder
// This maintains backward compatibility with imports from @/plane-web/store/command-palette.store
export {
  useCommandPaletteStore,
  CommandPaletteStore,
} from "@/store/client";
export type { ICommandPaletteStore, CommandPaletteStoreType } from "@/store/client";

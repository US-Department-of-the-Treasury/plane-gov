// Re-export from the Zustand store in client folder
// This maintains backward compatibility with imports from @/plane-web/store/command-palette.store
export { useCommandPaletteStore } from "@/store/client";
export type { CommandPaletteStore, ICommandPaletteStore, CommandPaletteStoreType } from "@/store/client";

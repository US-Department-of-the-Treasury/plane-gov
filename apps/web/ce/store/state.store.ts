// Re-export from the Zustand store in client folder
// This maintains backward compatibility with imports from @/plane-web/store/state.store
export { useStateStore } from "@/store/client";
export type { StateStore } from "@/store/client";

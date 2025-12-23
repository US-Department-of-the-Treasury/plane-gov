// Re-export from the Zustand store in client folder
// This maintains backward compatibility with imports from @/plane-web/store/state.store
export {
  useStateStore,
  StateStore,
} from "@/store/client";
export type { IStateStore, StateStoreType } from "@/store/client";

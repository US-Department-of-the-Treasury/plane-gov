// This is a placeholder file for CE (Community Edition) admin store
// The MobX stores have been migrated to TanStack Query + Zustand

import { CoreRootStore } from "@/store/root.store";

export class RootStore extends CoreRootStore {
  constructor() {
    super();
    // No-op - state is now managed by TanStack Query and Zustand
  }

  hydrate(initialData: any) {
    super.hydrate(initialData);
  }

  resetOnSignOut() {
    super.resetOnSignOut();
  }
}

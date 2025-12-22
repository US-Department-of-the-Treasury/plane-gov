// This is a placeholder file for the core admin store
// The MobX stores have been migrated to TanStack Query + Zustand

export abstract class CoreRootStore {
  constructor() {
    // No-op - state is now managed by TanStack Query and Zustand
  }

  hydrate(initialData: any) {
    // No-op - hydration is handled by query client and zustand stores
  }

  resetOnSignOut() {
    // No-op - sign out logic is handled by auth store and query client
    localStorage.setItem("theme", "system");
  }
}

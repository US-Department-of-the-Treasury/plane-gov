/**
 * Query Key Factory for Admin App
 *
 * Centralized query key definitions for TanStack Query.
 * Admin app manages instance configuration, users, and workspaces.
 *
 * Conventions:
 * - All keys are arrays
 * - Entity type is first element
 * - IDs and filters follow
 * - Use `as const` for type safety
 */
export const queryKeys = {
  // Instance queries
  instance: {
    info: () => ["instance", "info"] as const,
    config: () => ["instance", "config"] as const,
    admins: () => ["instance", "admins"] as const,
    configurations: () => ["instance", "configurations"] as const,
  },

  // User queries
  users: {
    me: () => ["users", "me"] as const,
    current: () => ["users", "me"] as const,
  },

  // Workspace queries
  workspaces: {
    all: () => ["workspaces"] as const,
    list: (cursor?: string) => ["workspaces", "list", cursor] as const,
    detail: (workspaceId: string) => ["workspaces", workspaceId] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;

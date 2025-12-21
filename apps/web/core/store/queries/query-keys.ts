/**
 * Query Key Factory
 *
 * Centralized query key definitions for TanStack Query.
 * Uses flat structure per migration plan recommendation.
 *
 * Conventions:
 * - All keys are arrays
 * - Entity type is first element
 * - IDs and filters follow
 * - Use `as const` for type safety
 *
 * Usage:
 *   queryKey: queryKeys.issues.all(workspaceSlug, projectId)
 *   queryKey: queryKeys.users.detail(userId)
 */
export const queryKeys = {
  // Workspace queries
  workspaces: {
    all: () => ["workspaces"] as const,
    detail: (slug: string) => ["workspaces", slug] as const,
    members: (slug: string) => ["workspaces", slug, "members"] as const,
  },

  // Project queries
  projects: {
    all: (workspaceSlug: string) => ["projects", workspaceSlug] as const,
    detail: (projectId: string) => ["projects", "detail", projectId] as const,
    members: (projectId: string) => ["projects", projectId, "members"] as const,
  },

  // Issue queries
  issues: {
    all: (workspaceSlug: string, projectId: string) => ["issues", workspaceSlug, projectId] as const,
    detail: (issueId: string) => ["issues", "detail", issueId] as const,
    filtered: (workspaceSlug: string, projectId: string, filters: Record<string, unknown>) =>
      ["issues", workspaceSlug, projectId, filters] as const,
    sprint: (sprintId: string) => ["issues", "sprint", sprintId] as const,
    module: (moduleId: string) => ["issues", "module", moduleId] as const,
    workspace: (workspaceSlug: string) => ["issues", "workspace", workspaceSlug] as const,
  },

  // Sprint queries
  sprints: {
    all: (workspaceSlug: string, projectId: string) => ["sprints", workspaceSlug, projectId] as const,
    detail: (sprintId: string) => ["sprints", "detail", sprintId] as const,
    active: (workspaceSlug: string, projectId: string) => ["sprints", workspaceSlug, projectId, "active"] as const,
  },

  // Module queries
  modules: {
    all: (workspaceSlug: string, projectId: string) => ["modules", workspaceSlug, projectId] as const,
    detail: (moduleId: string) => ["modules", "detail", moduleId] as const,
  },

  // User queries
  users: {
    me: () => ["users", "me"] as const,
    current: () => ["users", "me"] as const, // alias for me
    detail: (userId: string) => ["users", "detail", userId] as const,
    settings: () => ["users", "me", "settings"] as const,
    profile: () => ["users", "me", "profile"] as const,
  },

  // Label queries
  labels: {
    all: (workspaceSlug: string, projectId: string) => ["labels", workspaceSlug, projectId] as const,
    workspace: (workspaceSlug: string) => ["labels", "workspace", workspaceSlug] as const,
  },

  // State queries
  states: {
    all: (workspaceSlug: string, projectId: string) => ["states", workspaceSlug, projectId] as const,
  },

  // Member queries
  members: {
    workspace: (workspaceSlug: string) => ["members", "workspace", workspaceSlug] as const,
    project: (projectId: string) => ["members", "project", projectId] as const,
  },
} as const;

// Type helpers for query keys
export type QueryKeys = typeof queryKeys;

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
    lite: (workspaceSlug: string) => ["projects", workspaceSlug, "lite"] as const,
    detail: (projectId: string) => ["projects", "detail", projectId] as const,
    members: (projectId: string) => ["projects", projectId, "members"] as const,
    analytics: (workspaceSlug: string) => ["projects", workspaceSlug, "analytics"] as const,
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

  // Epic queries
  epics: {
    all: (workspaceSlug: string, projectId: string) => ["epics", workspaceSlug, projectId] as const,
    detail: (epicId: string) => ["epics", "detail", epicId] as const,
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
    workspace: (workspaceSlug: string) => ["states", "workspace", workspaceSlug] as const,
    intake: (workspaceSlug: string, projectId: string) => ["states", "intake", workspaceSlug, projectId] as const,
  },

  // Member queries
  members: {
    workspace: (workspaceSlug: string) => ["members", "workspace", workspaceSlug] as const,
    project: (projectId: string) => ["members", "project", projectId] as const,
  },

  // View queries
  views: {
    all: (workspaceSlug: string, projectId: string) => ["views", workspaceSlug, projectId] as const,
    detail: (viewId: string) => ["views", "detail", viewId] as const,
  },

  // Workspace View queries (Global Views)
  workspaceViews: {
    all: (workspaceSlug: string) => ["workspace-views", workspaceSlug] as const,
    detail: (viewId: string) => ["workspace-views", "detail", viewId] as const,
  },

  // Favorite queries
  favorites: {
    all: (workspaceSlug: string) => ["favorites", workspaceSlug] as const,
    grouped: (workspaceSlug: string, favoriteId: string) => ["favorites", workspaceSlug, "grouped", favoriteId] as const,
  },

  // Analytics queries
  analytics: {
    advance: (workspaceSlug: string, tab: string, params?: Record<string, unknown>) =>
      ["analytics", workspaceSlug, tab, params] as const,
    stats: (workspaceSlug: string, tab: string, params?: Record<string, unknown>) =>
      ["analytics", workspaceSlug, "stats", tab, params] as const,
    charts: (workspaceSlug: string, tab: string, params?: Record<string, unknown>) =>
      ["analytics", workspaceSlug, "charts", tab, params] as const,
  },

  // Workspace draft issue queries
  workspaceDrafts: {
    all: (workspaceSlug: string) => ["workspace-drafts", workspaceSlug] as const,
    filtered: (workspaceSlug: string, filters: Record<string, unknown>) =>
      ["workspace-drafts", workspaceSlug, filters] as const,
    detail: (issueId: string) => ["workspace-drafts", "detail", issueId] as const,
  },

  // Notification queries
  notifications: {
    all: (workspaceSlug: string) => ["notifications", workspaceSlug] as const,
    filtered: (workspaceSlug: string, params: Record<string, unknown>) =>
      ["notifications", workspaceSlug, params] as const,
    unreadCount: (workspaceSlug: string) => ["notifications", workspaceSlug, "unread-count"] as const,
  },

  // Instance queries
  instance: {
    info: () => ["instance", "info"] as const,
  },

  // Project publish queries
  projectPublish: {
    settings: (projectId: string) => ["project-publish", projectId, "settings"] as const,
  },

  // Sticky queries
  stickies: {
    all: (workspaceSlug: string, cursor: string, query?: string) =>
      ["stickies", workspaceSlug, cursor, query] as const,
    recent: (workspaceSlug: string) => ["stickies", workspaceSlug, "recent"] as const,
  },

  // Estimate queries
  estimates: {
    all: (workspaceSlug: string, projectId: string) => ["estimates", workspaceSlug, projectId] as const,
    workspace: (workspaceSlug: string) => ["estimates", "workspace", workspaceSlug] as const,
    detail: (estimateId: string) => ["estimates", "detail", estimateId] as const,
  },

  // Webhook queries
  webhooks: {
    all: (workspaceSlug: string) => ["webhooks", workspaceSlug] as const,
    detail: (webhookId: string) => ["webhooks", "detail", webhookId] as const,
  },

  // Inbox queries
  inbox: {
    all: (workspaceSlug: string, projectId: string) => ["inbox", workspaceSlug, projectId] as const,
    filtered: (workspaceSlug: string, projectId: string, filters: Record<string, unknown>) =>
      ["inbox", workspaceSlug, projectId, filters] as const,
    detail: (inboxIssueId: string) => ["inbox", "detail", inboxIssueId] as const,
  },

  // Dashboard queries
  dashboard: {
    home: (workspaceSlug: string) => ["dashboard", workspaceSlug, "home"] as const,
    widgets: (workspaceSlug: string, dashboardId: string) => ["dashboard", workspaceSlug, dashboardId, "widgets"] as const,
    widgetStats: (workspaceSlug: string, dashboardId: string, widgetKey: string) => ["dashboard", workspaceSlug, dashboardId, "stats", widgetKey] as const,
  },

  // Home queries
  home: {
    widgets: (workspaceSlug: string) => ["home", workspaceSlug, "widgets"] as const,
  },
} as const;

// Type helpers for query keys
export type QueryKeys = typeof queryKeys;

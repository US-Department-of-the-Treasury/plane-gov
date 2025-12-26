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

    // Paginated list query keys for TanStack Query infinite queries
    list: {
      project: (workspaceSlug: string, projectId: string, filters?: Record<string, unknown>) =>
        ["issues", "list", "project", workspaceSlug, projectId, filters ?? {}] as const,
      sprint: (workspaceSlug: string, projectId: string, sprintId: string, filters?: Record<string, unknown>) =>
        ["issues", "list", "sprint", workspaceSlug, projectId, sprintId, filters ?? {}] as const,
      epic: (workspaceSlug: string, projectId: string, epicId: string, filters?: Record<string, unknown>) =>
        ["issues", "list", "epic", workspaceSlug, projectId, epicId, filters ?? {}] as const,
      archived: (workspaceSlug: string, projectId: string, filters?: Record<string, unknown>) =>
        ["issues", "list", "archived", workspaceSlug, projectId, filters ?? {}] as const,
      profile: (workspaceSlug: string, userId: string, view: string, filters?: Record<string, unknown>) =>
        ["issues", "list", "profile", workspaceSlug, userId, view, filters ?? {}] as const,
      projectView: (workspaceSlug: string, projectId: string, viewId: string, filters?: Record<string, unknown>) =>
        ["issues", "list", "project-view", workspaceSlug, projectId, viewId, filters ?? {}] as const,
      workspaceView: (workspaceSlug: string, viewId: string, filters?: Record<string, unknown>) =>
        ["issues", "list", "workspace-view", workspaceSlug, viewId, filters ?? {}] as const,
      // Per-group pagination for Kanban views
      group: (
        baseKey: readonly unknown[],
        groupId: string,
        subGroupId?: string
      ) => [...baseKey, "group", groupId, subGroupId] as const,
    },
  },

  // Issue Details queries (for issue detail page components)
  issueDetails: {
    subscription: (issueId: string) => ["issues", "detail", issueId, "subscription"] as const,
    links: (issueId: string) => ["issues", "detail", issueId, "links"] as const,
    attachments: (issueId: string) => ["issues", "detail", issueId, "attachments"] as const,
    reactions: (issueId: string) => ["issues", "detail", issueId, "reactions"] as const,
    comments: (issueId: string) => ["issues", "detail", issueId, "comments"] as const,
    commentReactions: (commentId: string) => ["issues", "detail", "comment", commentId, "reactions"] as const,
    activities: (issueId: string) => ["issues", "detail", issueId, "activities"] as const,
    relations: (issueId: string) => ["issues", "detail", issueId, "relations"] as const,
    subIssues: (parentIssueId: string) => ["issues", "detail", parentIssueId, "sub-issues"] as const,
  },

  // Sprint queries
  sprints: {
    all: (workspaceSlug: string, projectId: string) => ["sprints", workspaceSlug, projectId] as const,
    detail: (sprintId: string) => ["sprints", "detail", sprintId] as const,
    active: (workspaceSlug: string, projectId: string) => ["sprints", workspaceSlug, projectId, "active"] as const,
    memberProjects: (workspaceSlug: string) => ["sprints", "member-projects", workspaceSlug] as const,
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

  // Workspace Link queries
  workspaceLinks: {
    all: (workspaceSlug: string) => ["workspace-links", workspaceSlug] as const,
    detail: (linkId: string) => ["workspace-links", "detail", linkId] as const,
  },

  // Favorite queries
  favorites: {
    all: (workspaceSlug: string) => ["favorites", workspaceSlug] as const,
    grouped: (workspaceSlug: string, favoriteId: string) =>
      ["favorites", workspaceSlug, "grouped", favoriteId] as const,
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
    infinite: (workspaceSlug: string, filters: Record<string, unknown>) =>
      ["workspace-drafts", workspaceSlug, "infinite", filters] as const,
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
    widgets: (workspaceSlug: string, dashboardId: string) =>
      ["dashboard", workspaceSlug, dashboardId, "widgets"] as const,
    widgetStats: (workspaceSlug: string, dashboardId: string, widgetKey: string) =>
      ["dashboard", workspaceSlug, dashboardId, "stats", widgetKey] as const,
  },

  // Home queries
  home: {
    widgets: (workspaceSlug: string) => ["home", workspaceSlug, "widgets"] as const,
  },

  // Timezone queries
  timezones: {
    all: () => ["timezones"] as const,
  },

  // API Token queries
  apiTokens: {
    all: (workspaceSlug: string) => ["api-tokens", workspaceSlug] as const,
    detail: (tokenId: string) => ["api-tokens", "detail", tokenId] as const,
  },

  // Email notification settings
  emailNotifications: {
    settings: () => ["email-notifications", "settings"] as const,
  },

  // Integration queries
  integrations: {
    app: () => ["integrations", "app"] as const,
    workspace: (workspaceSlug: string) => ["integrations", "workspace", workspaceSlug] as const,
    project: (workspaceSlug: string, projectId: string) => ["integrations", "project", workspaceSlug, projectId] as const,
    github: {
      repository: (projectId: string) => ["integrations", "github", "repository", projectId] as const,
      repositories: (workspaceSlug: string, integrationId: string) =>
        ["integrations", "github", "repositories", workspaceSlug, integrationId] as const,
      repositoryInfo: (workspaceSlug: string, repoName: string) =>
        ["integrations", "github", "repository-info", workspaceSlug, repoName] as const,
      commits: (workspaceSlug: string, projectId: string, integrationId: string, repoFullName: string) =>
        ["integrations", "github", "commits", workspaceSlug, projectId, integrationId, repoFullName] as const,
    },
    slack: {
      channelInfo: (workspaceSlug: string, projectId: string) =>
        ["integrations", "slack", "channel-info", workspaceSlug, projectId] as const,
    },
    jira: {
      projects: (workspaceSlug: string, integrationId: string) =>
        ["integrations", "jira", "projects", workspaceSlug, integrationId] as const,
      projectInfo: (workspaceSlug: string, projectId: string) =>
        ["integrations", "jira", "project-info", workspaceSlug, projectId] as const,
      users: (workspaceSlug: string, projectId: string) =>
        ["integrations", "jira", "users", workspaceSlug, projectId] as const,
    },
    imports: (workspaceSlug: string) => ["integrations", "imports", workspaceSlug] as const,
  },

  // User profile queries (for viewing other users' profiles)
  userProfiles: {
    detail: (workspaceSlug: string, userId: string) => ["user-profiles", workspaceSlug, userId] as const,
    projects: (workspaceSlug: string, userId: string) => ["user-profiles", workspaceSlug, userId, "projects"] as const,
    activity: (workspaceSlug: string, userId: string, params?: Record<string, unknown>) =>
      ["user-profiles", workspaceSlug, userId, "activity", params] as const,
    issues: (workspaceSlug: string, userId: string) => ["user-profiles", workspaceSlug, userId, "issues"] as const,
  },

  // User activity queries
  userActivity: {
    all: (params: Record<string, unknown>) => ["user-activity", params] as const,
  },

  // Exporter queries
  exporter: {
    services: (workspaceSlug: string, cursor: string, perPage: string) =>
      ["exporter", "services", workspaceSlug, cursor, perPage] as const,
  },

  // Description versions queries
  descriptionVersions: {
    all: (entityId: string) => ["description-versions", entityId] as const,
    detail: (versionId: string) => ["description-versions", "detail", versionId] as const,
  },

  // Pages queries (project pages, distinct from wiki pages)
  pages: {
    all: (workspaceSlug: string, projectId: string) => ["pages", workspaceSlug, projectId] as const,
    list: (workspaceSlug: string, projectId: string, pageType: string) =>
      ["pages", workspaceSlug, projectId, pageType] as const,
    detail: (pageId: string) => ["pages", "detail", pageId] as const,
    versions: (pageId: string) => ["pages", pageId, "versions"] as const,
    versionDetail: (versionId: string) => ["pages", "version", versionId] as const,
    archived: (workspaceSlug: string, projectId: string) => ["pages", workspaceSlug, projectId, "archived"] as const,
    favorites: (workspaceSlug: string, projectId: string) => ["pages", workspaceSlug, projectId, "favorites"] as const,
  },

  // Recents queries
  recents: {
    activity: (workspaceSlug: string, filter: string) => ["recents", workspaceSlug, filter] as const,
  },

  // Wiki queries
  wiki: {
    // Pages
    pages: {
      all: (workspaceSlug: string) => ["wiki", "pages", workspaceSlug] as const,
      detail: (pageId: string) => ["wiki", "pages", "detail", pageId] as const,
      archived: (workspaceSlug: string) => ["wiki", "pages", workspaceSlug, "archived"] as const,
      shared: (workspaceSlug: string) => ["wiki", "pages", workspaceSlug, "shared"] as const,
      private: (workspaceSlug: string) => ["wiki", "pages", workspaceSlug, "private"] as const,
      search: (workspaceSlug: string, query: string) => ["wiki", "pages", workspaceSlug, "search", query] as const,
    },
    // Collections
    collections: {
      all: (workspaceSlug: string) => ["wiki", "collections", workspaceSlug] as const,
      detail: (collectionId: string) => ["wiki", "collections", "detail", collectionId] as const,
    },
    // Shares
    shares: {
      all: (pageId: string) => ["wiki", "shares", pageId] as const,
    },
    // Versions
    versions: {
      all: (pageId: string) => ["wiki", "versions", pageId] as const,
      detail: (versionId: string) => ["wiki", "versions", "detail", versionId] as const,
    },
  },
} as const;

// Type helpers for query keys
export type QueryKeys = typeof queryKeys;

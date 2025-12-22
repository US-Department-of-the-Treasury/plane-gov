/**
 * Query Key Factory for Space App
 *
 * Centralized query key definitions for TanStack Query.
 * Space app has a simpler entity model focused on published issues.
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
  },

  // User queries
  users: {
    me: () => ["users", "me"] as const,
    current: () => ["users", "me"] as const,
    profile: () => ["users", "me", "profile"] as const,
  },

  // Publish queries (space-specific)
  publish: {
    settings: (anchor: string) => ["publish", anchor, "settings"] as const,
    list: () => ["publish", "list"] as const,
  },

  // Issue queries (for published issues)
  issues: {
    all: (anchor: string) => ["issues", anchor] as const,
    detail: (anchor: string, issueId: string) => ["issues", anchor, "detail", issueId] as const,
    filtered: (anchor: string, filters: Record<string, unknown>) => ["issues", anchor, filters] as const,
    grouped: (anchor: string, groupBy: string, filters?: Record<string, unknown>) =>
      ["issues", anchor, "grouped", groupBy, filters] as const,
  },

  // State queries
  states: {
    all: (anchor: string) => ["states", anchor] as const,
  },

  // Label queries
  labels: {
    all: (anchor: string) => ["labels", anchor] as const,
  },

  // Member queries
  members: {
    all: (anchor: string) => ["members", anchor] as const,
  },

  // Sprint queries
  sprints: {
    all: (anchor: string) => ["sprints", anchor] as const,
    detail: (anchor: string, sprintId: string) => ["sprints", anchor, sprintId] as const,
  },

  // Epic queries
  epics: {
    all: (anchor: string) => ["epics", anchor] as const,
    detail: (anchor: string, epicId: string) => ["epics", anchor, epicId] as const,
  },

  // Issue detail queries
  issueDetail: {
    activity: (anchor: string, issueId: string) => ["issues", anchor, "detail", issueId, "activity"] as const,
    comments: (anchor: string, issueId: string) => ["issues", anchor, "detail", issueId, "comments"] as const,
    reactions: (anchor: string, issueId: string) => ["issues", anchor, "detail", issueId, "reactions"] as const,
    votes: (anchor: string, issueId: string) => ["issues", anchor, "detail", issueId, "votes"] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;

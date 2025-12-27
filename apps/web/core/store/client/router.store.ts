import type { ParsedUrlQuery } from "node:querystring";
import { create } from "zustand";
import type { TProfileViews } from "@plane/types";

export interface IRouterStore {
  // observables
  query: ParsedUrlQuery;
  // actions
  setQuery: (query: ParsedUrlQuery) => void;
  // computed
  workspaceSlug: string | undefined;
  teamspaceId: string | undefined;
  projectId: string | undefined;
  sprintId: string | undefined;
  epicId: string | undefined;
  viewId: string | undefined;
  globalViewId: string | undefined;
  profileViewId: TProfileViews | undefined;
  userId: string | undefined;
  peekId: string | undefined;
  issueId: string | undefined;
  inboxId: string | undefined;
  webhookId: string | undefined;
}

interface RouterState {
  query: ParsedUrlQuery;
}

interface RouterActions {
  setQuery: (query: ParsedUrlQuery) => void;
}

export type RouterStoreType = RouterState & RouterActions;

export const useRouterStore = create<RouterStoreType>()((set) => ({
  query: {},

  setQuery: (query: ParsedUrlQuery) => {
    set({ query });
  },
}));

// Helper to get computed values from query
const getQueryValue = (query: ParsedUrlQuery, key: string): string | undefined => {
  const value = query[key];
  return value?.toString();
};

/**
 * Helper functions to get router values directly from the Zustand store.
 * Use these in store classes instead of rootStore.router.
 */
export const getRouterWorkspaceSlug = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "workspaceSlug");

export const getRouterProjectId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "projectId");

export const getRouterSprintId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "sprintId");

export const getRouterEpicId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "epicId");

export const getRouterViewId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "viewId");

export const getRouterGlobalViewId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "globalViewId");

export const getRouterUserId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "userId");

export const getRouterPeekId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "peekId");

export const getRouterIssueId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "issueId");

export const getRouterInboxId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "inboxId");

export const getRouterWebhookId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "webhookId");

export const getRouterTeamspaceId = (): string | undefined =>
  getQueryValue(useRouterStore.getState().query, "teamspaceId");


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
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useRouterStore hook directly in React components
 */
export class RouterStoreLegacy implements IRouterStore {
  get query() {
    return useRouterStore.getState().query;
  }

  setQuery = (query: ParsedUrlQuery) => {
    useRouterStore.getState().setQuery(query);
  };

  get workspaceSlug() {
    return getQueryValue(this.query, "workspaceSlug");
  }

  get teamspaceId() {
    return getQueryValue(this.query, "teamspaceId");
  }

  get projectId() {
    return getQueryValue(this.query, "projectId");
  }

  get sprintId() {
    return getQueryValue(this.query, "sprintId");
  }

  get epicId() {
    return getQueryValue(this.query, "epicId");
  }

  get viewId() {
    return getQueryValue(this.query, "viewId");
  }

  get globalViewId() {
    return getQueryValue(this.query, "globalViewId");
  }

  get profileViewId() {
    return getQueryValue(this.query, "profileViewId") as TProfileViews | undefined;
  }

  get userId() {
    return getQueryValue(this.query, "userId");
  }

  get peekId() {
    return getQueryValue(this.query, "peekId");
  }

  get issueId() {
    return getQueryValue(this.query, "issueId");
  }

  get inboxId() {
    return getQueryValue(this.query, "inboxId");
  }

  get webhookId() {
    return getQueryValue(this.query, "webhookId");
  }
}

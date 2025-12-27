/**
 * CE Issue Activity Store - Migrated to Zustand
 *
 * This store manages issue activities and their integration with comments.
 *
 * Available TanStack Query hooks (already migrated):
 * - useIssueActivities(workspaceSlug, projectId, issueId) - Fetch issue activities
 *
 * Migration notes:
 * - The `fetchActivities` method can be replaced with `useIssueActivities` hook
 * - The activity/comment merging logic (`getActivityAndCommentsByIssueId`) would need
 *   to be refactored to work with TanStack Query data
 * - Full migration requires migrating IssueCommentStore as well
 *
 * Recommended approach:
 * 1. Migrate IssueCommentStore to TanStack Query (create comment hooks)
 * 2. Create utility functions for merging activities and comments
 * 3. Replace this store with those utilities in components
 */

import { concat, orderBy, set as lodashSet, uniq, update } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane package imports
import type { E_SORT_ORDER } from "@plane/constants";
import { EActivityFilterType } from "@plane/constants";
import type {
  TIssueActivityComment,
  TIssueActivity,
  TIssueActivityMap,
  TIssueActivityIdMap,
  TIssueServiceType,
} from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// plane web constants
// services
import { IssueActivityService } from "@/services/issue";
// store
import type { CoreRootStore } from "@/store/root.store";

export type TActivityLoader = "fetch" | "mutate" | undefined;

export interface IIssueActivityStoreActions {
  // actions
  fetchActivities: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType?: TActivityLoader
  ) => Promise<TIssueActivity[]>;
}

export interface IIssueActivityStore extends IIssueActivityStoreActions {
  // observables
  loader: TActivityLoader;
  activities: TIssueActivityIdMap;
  activityMap: TIssueActivityMap;
  // helper methods
  getActivitiesByIssueId: (issueId: string) => string[] | undefined;
  getActivityById: (activityId: string) => TIssueActivity | undefined;
  getActivityAndCommentsByIssueId: (issueId: string, sortOrder: E_SORT_ORDER) => TIssueActivityComment[] | undefined;
}

// Zustand store state
interface IssueActivityStoreState {
  loader: TActivityLoader;
  activities: TIssueActivityIdMap;
  activityMap: TIssueActivityMap;
  serviceType: TIssueServiceType;
}

// Zustand store actions
interface IssueActivityStoreActions {
  setLoader: (loader: TActivityLoader) => void;
  setServiceType: (serviceType: TIssueServiceType) => void;
  updateActivities: (issueId: string, activityIds: string[]) => void;
  updateActivityMap: (activities: TIssueActivity[]) => void;
  getActivitiesByIssueId: (issueId: string) => string[] | undefined;
  getActivityById: (activityId: string) => TIssueActivity | undefined;
  // Async action - can be called directly without rootStore
  fetchActivities: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType?: TActivityLoader
  ) => Promise<TIssueActivity[]>;
}

type IssueActivityStoreType = IssueActivityStoreState & IssueActivityStoreActions;

// Zustand store
export const useIssueActivityStore = create<IssueActivityStoreType>()(
  immer((set, get) => ({
    // State
    loader: "fetch",
    activities: {},
    activityMap: {},
    serviceType: EIssueServiceType.ISSUES,

    // Actions
    setLoader: (loader: TActivityLoader) => {
      set((state) => {
        state.loader = loader;
      });
    },

    setServiceType: (serviceType: TIssueServiceType) => {
      set((state) => {
        state.serviceType = serviceType;
      });
    },

    updateActivities: (issueId: string, activityIds: string[]) => {
      set((state) => {
        update(state.activities, issueId, (currentActivityIds) => {
          if (!currentActivityIds) return activityIds;
          return uniq(concat(currentActivityIds, activityIds));
        });
      });
    },

    updateActivityMap: (activities: TIssueActivity[]) => {
      set((state) => {
        activities.forEach((activity) => {
          lodashSet(state.activityMap, activity.id, activity);
        });
      });
    },

    // Helper methods
    getActivitiesByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      const state = get();
      return state.activities[issueId] ?? undefined;
    },

    getActivityById: (activityId: string) => {
      if (!activityId) return undefined;
      const state = get();
      return state.activityMap[activityId] ?? undefined;
    },

    // Async action - can be called directly without rootStore
    fetchActivities: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      loaderType: TActivityLoader = "fetch"
    ): Promise<TIssueActivity[]> => {
      const state = get();
      const service = new IssueActivityService(state.serviceType);

      try {
        state.setLoader(loaderType);

        let props = {};
        const currentActivityIds = state.getActivitiesByIssueId(issueId);
        if (currentActivityIds && currentActivityIds.length > 0) {
          const currentActivity = state.getActivityById(currentActivityIds[currentActivityIds.length - 1]);
          if (currentActivity) props = { created_at__gt: currentActivity.created_at };
        }

        const activities = await service.getIssueActivities(workspaceSlug, projectId, issueId, props);

        const activityIds = activities.map((activity) => activity.id);

        state.updateActivities(issueId, activityIds);
        state.updateActivityMap(activities);
        state.setLoader(undefined);

        return activities;
      } catch (error) {
        state.setLoader(undefined);
        throw error;
      }
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class IssueActivityStore implements IIssueActivityStore {
  serviceType;

  constructor(
    protected store: CoreRootStore,
    serviceType: TIssueServiceType = EIssueServiceType.ISSUES
  ) {
    this.serviceType = serviceType;
  }

  private get state() {
    return useIssueActivityStore.getState();
  }

  // Observables (getters that read from Zustand store)
  get loader() {
    return this.state.loader;
  }

  get activities() {
    return this.state.activities;
  }

  get activityMap() {
    return this.state.activityMap;
  }

  // Helper methods (delegate to Zustand store)
  getActivitiesByIssueId = (issueId: string) => {
    return this.state.getActivitiesByIssueId(issueId);
  };

  getActivityById = (activityId: string) => {
    return this.state.getActivityById(activityId);
  };

  getActivityAndCommentsByIssueId = (issueId: string, sortOrder: E_SORT_ORDER) => {
    if (!issueId) return undefined;

    const activityComments: TIssueActivityComment[] = [];

    const currentStore =
      this.serviceType === EIssueServiceType.EPICS ? this.store.issue.epicDetail : this.store.issue.issueDetail;

    const activities = this.getActivitiesByIssueId(issueId);
    const comments = currentStore.comment.getCommentsByIssueId(issueId);

    if (!activities || !comments) return undefined;

    activities.forEach((activityId) => {
      const activity = this.getActivityById(activityId);
      if (!activity) return;
      const type =
        activity.field === "state"
          ? EActivityFilterType.STATE
          : activity.field === "assignees"
            ? EActivityFilterType.ASSIGNEE
            : activity.field === null
              ? EActivityFilterType.DEFAULT
              : EActivityFilterType.ACTIVITY;
      activityComments.push({
        id: activity.id,
        activity_type: type,
        created_at: activity.created_at,
      });
    });

    comments.forEach((commentId) => {
      const comment = currentStore.comment.getCommentById(commentId);
      if (!comment) return;
      activityComments.push({
        id: comment.id,
        activity_type: EActivityFilterType.COMMENT,
        created_at: comment.created_at,
      });
    });

    return orderBy(activityComments, (e) => new Date(e.created_at || 0), sortOrder);
  };

  // Actions - delegate to Zustand store
  fetchActivities = (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType: TActivityLoader = "fetch"
  ): Promise<TIssueActivity[]> => {
    // Ensure the serviceType is set before fetching
    this.state.setServiceType(this.serviceType);
    return this.state.fetchActivities(workspaceSlug, projectId, issueId, loaderType);
  };
}

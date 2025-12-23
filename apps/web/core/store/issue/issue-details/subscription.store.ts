import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// services
import type { EIssueServiceType } from "@plane/types";
import { IssueService } from "@/services/issue/issue.service";

export interface IIssueSubscriptionStore {
  // state
  subscriptionMap: Record<string, Record<string, boolean>>; // issueId -> userId -> subscribed
  // helper methods
  getSubscriptionByIssueId: (issueId: string, currentUserId: string | undefined) => boolean | undefined;
  // actions
  addSubscription: (issueId: string, currentUserId: string, isSubscribed: boolean | undefined | null) => void;
  fetchSubscriptions: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    currentUserId: string
  ) => Promise<boolean>;
  createSubscription: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    currentUserId: string
  ) => Promise<void>;
  removeSubscription: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    currentUserId: string
  ) => Promise<void>;
}

// Store factory for different service types
const subscriptionServiceMap = new Map<EIssueServiceType, IssueService>();

const getSubscriptionService = (serviceType: EIssueServiceType): IssueService => {
  if (!subscriptionServiceMap.has(serviceType)) {
    subscriptionServiceMap.set(serviceType, new IssueService(serviceType));
  }
  return subscriptionServiceMap.get(serviceType)!;
};

export const useIssueSubscriptionStore = create<IIssueSubscriptionStore>()(
  immer((set, get) => ({
    // state
    subscriptionMap: {},

    // helper methods
    getSubscriptionByIssueId: (issueId: string, currentUserId: string | undefined) => {
      if (!issueId || !currentUserId) return undefined;
      return get().subscriptionMap[issueId]?.[currentUserId] ?? undefined;
    },

    // actions
    addSubscription: (issueId: string, currentUserId: string, isSubscribed: boolean | undefined | null) => {
      if (!currentUserId) throw new Error("user id not available");

      set((state) => {
        if (!state.subscriptionMap[issueId]) {
          state.subscriptionMap[issueId] = {};
        }
        state.subscriptionMap[issueId][currentUserId] = isSubscribed ?? false;
      });
    },

    fetchSubscriptions: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      currentUserId: string
    ) => {
      const service = getSubscriptionService("WORKSPACE");
      const subscription = await service.getIssueNotificationSubscriptionStatus(
        workspaceSlug,
        projectId,
        issueId
      );

      get().addSubscription(issueId, currentUserId, subscription?.subscribed);
      return subscription?.subscribed;
    },

    createSubscription: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      currentUserId: string
    ) => {
      const service = getSubscriptionService("WORKSPACE");

      try {
        if (!currentUserId) throw new Error("user id not available");

        // Optimistic update
        set((state) => {
          if (!state.subscriptionMap[issueId]) {
            state.subscriptionMap[issueId] = {};
          }
          state.subscriptionMap[issueId][currentUserId] = true;
        });

        await service.subscribeToIssueNotifications(workspaceSlug, projectId, issueId);
      } catch (error) {
        // Refetch on error
        await get().fetchSubscriptions(workspaceSlug, projectId, issueId, currentUserId);
        throw error;
      }
    },

    removeSubscription: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      currentUserId: string
    ) => {
      const service = getSubscriptionService("WORKSPACE");

      try {
        if (!currentUserId) throw new Error("user id not available");

        // Optimistic update
        set((state) => {
          if (!state.subscriptionMap[issueId]) {
            state.subscriptionMap[issueId] = {};
          }
          state.subscriptionMap[issueId][currentUserId] = false;
        });

        await service.unsubscribeFromIssueNotifications(workspaceSlug, projectId, issueId);
      } catch (error) {
        // Refetch on error
        await get().fetchSubscriptions(workspaceSlug, projectId, issueId, currentUserId);
        throw error;
      }
    },
  }))
);

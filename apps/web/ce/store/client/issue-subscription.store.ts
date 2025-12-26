import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
// services
import type { EIssueServiceType } from "@plane/types";
import { IssueService } from "@/services/issue/issue.service";
// types
import type { IIssueDetail } from "@/plane-web/store/issue/issue-details/root.store";

// Service instance at module level (will be initialized per service type)
const serviceInstances = new Map<EIssueServiceType, IssueService>();

const getIssueService = (serviceType: EIssueServiceType) => {
  if (!serviceInstances.has(serviceType)) {
    serviceInstances.set(serviceType, new IssueService(serviceType));
  }
  return serviceInstances.get(serviceType)!;
};

// State interface
interface IssueSubscriptionStoreState {
  subscriptionMap: Record<string, Record<string, boolean>>; // Record<issueId, Record<userId, isSubscribed>>
  rootIssueDetail: IIssueDetail | null;
  serviceType: EIssueServiceType | null;
}

// Actions interface
interface IssueSubscriptionStoreActions {
  // Initialization
  initialize: (rootIssueDetail: IIssueDetail, serviceType: EIssueServiceType) => void;

  // Helper methods
  getSubscriptionByIssueId: (issueId: string) => boolean | undefined;

  // Actions
  addSubscription: (issueId: string, isSubscribed: boolean | undefined | null) => void;
  fetchSubscriptions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<boolean>;
  createSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  removeSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
}

// Combined type
export type IssueSubscriptionStoreZustand = IssueSubscriptionStoreState & IssueSubscriptionStoreActions;

// Initial state
const initialState: IssueSubscriptionStoreState = {
  subscriptionMap: {},
  rootIssueDetail: null,
  serviceType: null,
};

/**
 * Issue Subscription Store (Zustand)
 *
 * Manages issue notification subscriptions.
 * Migrated from MobX IssueSubscriptionStore to Zustand.
 *
 * Migration notes:
 * - Service instance managed at module level
 * - Uses immutable updates with set()
 * - Preserves optimistic updates with error rollback
 * - Stores rootIssueDetail reference to access currentUserId
 */
export const useIssueSubscriptionStore = create<IssueSubscriptionStoreZustand>()((set, get) => ({
  ...initialState,

  // Initialization
  initialize: (rootIssueDetail, serviceType) => {
    set({ rootIssueDetail, serviceType });
  },

  // Helper methods
  getSubscriptionByIssueId: (issueId) => {
    const state = get();
    if (!issueId) return undefined;
    const currentUserId = state.rootIssueDetail?.rootIssueStore.currentUserId;
    if (!currentUserId) return undefined;
    return state.subscriptionMap[issueId]?.[currentUserId] ?? undefined;
  },

  // Actions
  addSubscription: (issueId, isSubscribed) => {
    const state = get();
    const currentUserId = state.rootIssueDetail?.rootIssueStore.currentUserId;
    if (!currentUserId) throw new Error("user id not available");

    const newSubscriptionMap = { ...state.subscriptionMap };
    // Use string path for proper Zustand reactivity
    lodashSet(newSubscriptionMap, `${issueId}.${currentUserId}`, isSubscribed ?? false);

    set({ subscriptionMap: newSubscriptionMap });
  },

  fetchSubscriptions: async (workspaceSlug, projectId, issueId) => {
    const state = get();
    if (!state.serviceType) throw new Error("service type not initialized");

    const issueService = getIssueService(state.serviceType);
    const subscription = await issueService.getIssueNotificationSubscriptionStatus(
      workspaceSlug,
      projectId,
      issueId
    );

    get().addSubscription(issueId, subscription?.subscribed);
    return subscription?.subscribed;
  },

  createSubscription: async (workspaceSlug, projectId, issueId) => {
    const state = get();
    if (!state.serviceType) throw new Error("service type not initialized");

    const currentUserId = state.rootIssueDetail?.rootIssueStore.currentUserId;
    if (!currentUserId) throw new Error("user id not available");

    // Optimistically update the subscription
    const previousSubscriptionMap = { ...state.subscriptionMap };
    const newSubscriptionMap = { ...state.subscriptionMap };
    // Use string path for proper Zustand reactivity
    lodashSet(newSubscriptionMap, `${issueId}.${currentUserId}`, true);
    set({ subscriptionMap: newSubscriptionMap });

    try {
      const issueService = getIssueService(state.serviceType);
      await issueService.subscribeToIssueNotifications(workspaceSlug, projectId, issueId);
    } catch (error) {
      // Rollback on error
      set({ subscriptionMap: previousSubscriptionMap });
      await get().fetchSubscriptions(workspaceSlug, projectId, issueId);
      throw error;
    }
  },

  removeSubscription: async (workspaceSlug, projectId, issueId) => {
    const state = get();
    if (!state.serviceType) throw new Error("service type not initialized");

    const currentUserId = state.rootIssueDetail?.rootIssueStore.currentUserId;
    if (!currentUserId) throw new Error("user id not available");

    // Optimistically update the subscription
    const previousSubscriptionMap = { ...state.subscriptionMap };
    const newSubscriptionMap = { ...state.subscriptionMap };
    // Use string path for proper Zustand reactivity
    lodashSet(newSubscriptionMap, `${issueId}.${currentUserId}`, false);
    set({ subscriptionMap: newSubscriptionMap });

    try {
      const issueService = getIssueService(state.serviceType);
      await issueService.unsubscribeFromIssueNotifications(workspaceSlug, projectId, issueId);
    } catch (error) {
      // Rollback on error
      set({ subscriptionMap: previousSubscriptionMap });
      await get().fetchSubscriptions(workspaceSlug, projectId, issueId);
      throw error;
    }
  },
}));

// Legacy interface (matches original MobX interface)
export interface IIssueSubscriptionStoreActions {
  addSubscription: (issueId: string, isSubscribed: boolean | undefined | null) => void;
  fetchSubscriptions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<boolean>;
  createSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  removeSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
}

export interface IIssueSubscriptionStore extends IIssueSubscriptionStoreActions {
  // observables
  subscriptionMap: Record<string, Record<string, boolean>>;
  // helper methods
  getSubscriptionByIssueId: (issueId: string) => boolean | undefined;
}

// Legacy class wrapper for backward compatibility
export class IssueSubscriptionStore implements IIssueSubscriptionStore {
  private storeInstance: ReturnType<typeof useIssueSubscriptionStore.getState>;

  constructor(rootStore: IIssueDetail, serviceType: EIssueServiceType) {
    // Initialize the Zustand store with the dependencies
    useIssueSubscriptionStore.getState().initialize(rootStore, serviceType);
    this.storeInstance = useIssueSubscriptionStore.getState();
  }

  // Getter for subscriptionMap that delegates to Zustand store
  get subscriptionMap(): Record<string, Record<string, boolean>> {
    return useIssueSubscriptionStore.getState().subscriptionMap;
  }

  // Helper methods that delegate to Zustand store
  getSubscriptionByIssueId = (issueId: string): boolean | undefined => {
    return useIssueSubscriptionStore.getState().getSubscriptionByIssueId(issueId);
  };

  // Action methods that delegate to Zustand store
  addSubscription = (issueId: string, isSubscribed: boolean | undefined | null): void => {
    return useIssueSubscriptionStore.getState().addSubscription(issueId, isSubscribed);
  };

  fetchSubscriptions = async (workspaceSlug: string, projectId: string, issueId: string): Promise<boolean> => {
    return useIssueSubscriptionStore.getState().fetchSubscriptions(workspaceSlug, projectId, issueId);
  };

  createSubscription = async (workspaceSlug: string, projectId: string, issueId: string): Promise<void> => {
    return useIssueSubscriptionStore.getState().createSubscription(workspaceSlug, projectId, issueId);
  };

  removeSubscription = async (workspaceSlug: string, projectId: string, issueId: string): Promise<void> => {
    return useIssueSubscriptionStore.getState().removeSubscription(workspaceSlug, projectId, issueId);
  };
}

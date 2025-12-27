import { pull, concat, uniq, set as lodashSet, update, clone } from "lodash-es";
import { create } from "zustand";
import type { EIssueFilterType } from "@plane/constants";
// Plane Imports
import type {
  TIssue,
  TIssueSubIssues,
  TIssueSubIssuesStateDistributionMap,
  TIssueSubIssuesIdMap,
  TSubIssuesStateDistribution,
  TIssueServiceType,
  TLoader,
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  IIssueFilterOptions,
  ISubWorkItemFilters,
  TGroupedIssues,
} from "@plane/types";
// services
import { IssueService } from "@/services/issue";
// helpers
import {
  getFilteredWorkItems,
  getGroupedWorkItemIds,
  updateSubWorkItemFilters,
} from "@/store/issue/helpers/base-issues-utils";
// store
import type { IIssueDetail } from "@/store/issue/issue-details/root.store";
import { useStateStore } from "@/store/client";

// Service instance at module level
const issueService = new IssueService();

// Default display properties
export const DEFAULT_DISPLAY_PROPERTIES = {
  key: true,
  issue_type: true,
  assignee: true,
  start_date: true,
  due_date: true,
  labels: true,
  priority: true,
  state: true,
};

type TSubIssueHelpersKeys = "issue_visibility" | "preview_loader" | "issue_loader";
type TSubIssueHelpers = Record<TSubIssueHelpersKeys, string[]>;

// State interface
interface IssueSubIssuesStoreState {
  // Main state
  subIssuesStateDistribution: TIssueSubIssuesStateDistributionMap;
  subIssues: TIssueSubIssuesIdMap;
  subIssueHelpers: Record<string, TSubIssueHelpers>;
  loader: TLoader;

  // Filters state
  subIssueFilters: Record<string, Partial<ISubWorkItemFilters>>;

  // Root store reference
  rootIssueDetailStore: IIssueDetail | null;
  serviceType: TIssueServiceType | null;
}

// Actions interface
interface IssueSubIssuesStoreActions {
  // Initialization
  initialize: (rootStore: IIssueDetail, serviceType: TIssueServiceType) => void;

  // Main actions
  fetchSubIssues: (workspaceSlug: string, projectId: string, parentIssueId: string) => Promise<TIssueSubIssues>;
  createSubIssues: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueIds: string[]
  ) => Promise<void>;
  updateSubIssue: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    issueData: Partial<TIssue>,
    oldIssue?: Partial<TIssue>,
    fromModal?: boolean
  ) => Promise<void>;
  removeSubIssue: (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => Promise<void>;
  deleteSubIssue: (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => Promise<void>;
  fetchOtherProjectProperties: (workspaceSlug: string, projectIds: string[]) => Promise<void>;
  setSubIssueHelpers: (parentIssueId: string, key: TSubIssueHelpersKeys, value: string) => void;

  // Helper methods
  stateDistributionByIssueId: (issueId: string) => TSubIssuesStateDistribution | undefined;
  subIssuesByIssueId: (issueId: string) => string[] | undefined;
  subIssueHelpersByIssueId: (issueId: string) => TSubIssueHelpers;

  // Filter actions
  updateSubWorkItemFilters: (
    filterType: EIssueFilterType,
    filters: IIssueDisplayFilterOptions | IIssueDisplayProperties | IIssueFilterOptions,
    workItemId: string
  ) => void;
  getGroupedSubWorkItems: (workItemId: string) => TGroupedIssues;
  getFilteredSubWorkItems: (workItemId: string, filters: IIssueFilterOptions) => TIssue[];
  getSubIssueFilters: (workItemId: string) => Partial<ISubWorkItemFilters>;
  resetFilters: (workItemId: string) => void;
  initializeFilters: (workItemId: string) => void;
}

// Combined store type
export type IssueSubIssuesStore = IssueSubIssuesStoreState & IssueSubIssuesStoreActions;

// Initial state
const initialState: IssueSubIssuesStoreState = {
  subIssuesStateDistribution: {},
  subIssues: {},
  subIssueHelpers: {},
  loader: undefined,
  subIssueFilters: {},
  rootIssueDetailStore: null,
  serviceType: null,
};

/**
 * Issue Sub-Issues Store (Zustand)
 *
 * Manages sub-issues state and filters for issue detail views.
 * Migrated from MobX IssueSubIssuesStore to Zustand.
 *
 * This store handles:
 * - Sub-issues data and state distribution
 * - Sub-issue helpers (visibility, loaders)
 * - Sub-issue filters (display properties, filters, display filters)
 * - CRUD operations for sub-issues
 */
export const useIssueSubIssuesStore = create<IssueSubIssuesStore>()((set, get) => ({
  ...initialState,

  // Initialization
  initialize: (rootStore: IIssueDetail, serviceType: TIssueServiceType) => {
    set({
      rootIssueDetailStore: rootStore,
      serviceType,
    });
  },

  // Helper methods
  stateDistributionByIssueId: (issueId: string) => {
    if (!issueId) return undefined;
    const state = get();
    return state.subIssuesStateDistribution[issueId] ?? undefined;
  },

  subIssuesByIssueId: (issueId: string) => {
    const state = get();
    return state.subIssues[issueId];
  },

  subIssueHelpersByIssueId: (issueId: string) => {
    const state = get();
    return {
      preview_loader: state.subIssueHelpers?.[issueId]?.preview_loader || [],
      issue_visibility: state.subIssueHelpers?.[issueId]?.issue_visibility || [],
      issue_loader: state.subIssueHelpers?.[issueId]?.issue_loader || [],
    };
  },

  // Actions
  setSubIssueHelpers: (parentIssueId: string, key: TSubIssueHelpersKeys, value: string) => {
    if (!parentIssueId || !key || !value) return;

    const state = get();
    const newHelpers = clone(state.subIssueHelpers);

    update(newHelpers, [parentIssueId, key], (_subIssueHelpers: string[] = []) => {
      if (_subIssueHelpers.includes(value)) return pull(_subIssueHelpers, value);
      return concat(_subIssueHelpers, value);
    });

    set({ subIssueHelpers: newHelpers });
  },

  fetchSubIssues: async (workspaceSlug: string, projectId: string, parentIssueId: string) => {
    const state = get();
    if (!state.rootIssueDetailStore) throw new Error("Root store not initialized");

    set({ loader: "init-loader" });

    try {
      const response = await issueService.subIssues(workspaceSlug, projectId, parentIssueId);

      const subIssuesStateDistribution = response?.state_distribution ?? {};
      const issueList = (response.sub_issues ?? []) as TIssue[];

      state.rootIssueDetailStore.rootIssueStore.issues.addIssue(issueList);

      // fetch other issues states and members when sub-issues are from different project
      if (issueList && issueList.length > 0) {
        const otherProjectIds = uniq(
          issueList.map((issue) => issue.project_id).filter((id) => !!id && id !== projectId)
        ) as string[];
        await get().fetchOtherProjectProperties(workspaceSlug, otherProjectIds);
      }

      if (issueList) {
        state.rootIssueDetailStore.rootIssueStore.issues.updateIssue(parentIssueId, {
          sub_issues_count: issueList.length,
        });
      }

      const newStateDistribution = { ...state.subIssuesStateDistribution };
      lodashSet(newStateDistribution, parentIssueId, subIssuesStateDistribution);

      const newSubIssues = { ...state.subIssues };
      lodashSet(
        newSubIssues,
        parentIssueId,
        issueList.map((issue) => issue.id)
      );

      set({
        subIssuesStateDistribution: newStateDistribution,
        subIssues: newSubIssues,
        loader: undefined,
      });

      return response;
    } catch (error) {
      set({ loader: undefined });
      throw error;
    }
  },

  createSubIssues: async (workspaceSlug: string, projectId: string, parentIssueId: string, issueIds: string[]) => {
    const state = get();
    if (!state.rootIssueDetailStore) throw new Error("Root store not initialized");

    const response = await issueService.addSubIssues(workspaceSlug, projectId, parentIssueId, {
      sub_issue_ids: issueIds,
    });

    const subIssuesStateDistribution = response?.state_distribution;
    const subIssues = response.sub_issues as TIssue[];

    // fetch other issues states and members when sub-issues are from different project
    if (subIssues && subIssues.length > 0) {
      const otherProjectIds = uniq(
        subIssues.map((issue) => issue.project_id).filter((id) => !!id && id !== projectId)
      ) as string[];
      await get().fetchOtherProjectProperties(workspaceSlug, otherProjectIds);
    }

    const newStateDistribution = clone(state.subIssuesStateDistribution);
    Object.keys(subIssuesStateDistribution).forEach((key) => {
      const stateGroup = key as keyof TSubIssuesStateDistribution;
      update(newStateDistribution, [parentIssueId, stateGroup], (stateDistribution) => {
        if (!stateDistribution) return subIssuesStateDistribution[stateGroup];
        return concat(stateDistribution, subIssuesStateDistribution[stateGroup]);
      });
    });

    const issueIds_new = subIssues.map((issue) => issue.id);
    const newSubIssues = clone(state.subIssues);
    update(newSubIssues, [parentIssueId], (issues) => {
      if (!issues) return issueIds_new;
      return concat(issues, issueIds_new);
    });

    set({
      subIssuesStateDistribution: newStateDistribution,
      subIssues: newSubIssues,
    });

    state.rootIssueDetailStore.rootIssueStore.issues.addIssue(subIssues);

    // update sub-issues_count of the parent issue
    const updatedIssuesMap = clone(state.rootIssueDetailStore.rootIssueStore.issues.issuesMap);
    // Use string path for proper Zustand reactivity
    lodashSet(updatedIssuesMap, `${parentIssueId}.sub_issues_count`, newSubIssues[parentIssueId].length);
    state.rootIssueDetailStore.rootIssueStore.issues.issuesMap = updatedIssuesMap;
  },

  updateSubIssue: async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    issueData: Partial<TIssue>,
    oldIssue: Partial<TIssue> = {},
    fromModal: boolean = false
  ) => {
    const state = get();
    if (!state.rootIssueDetailStore) throw new Error("Root store not initialized");

    if (!fromModal) {
      await state.rootIssueDetailStore.rootIssueStore.projectIssues.updateIssue(
        workspaceSlug,
        projectId,
        issueId,
        issueData
      );
    }

    // parent update
    if (issueData.hasOwnProperty("parent_id") && issueData.parent_id !== oldIssue.parent_id) {
      const newSubIssues = clone(state.subIssues);

      if (oldIssue.parent_id) {
        pull(newSubIssues[oldIssue.parent_id], issueId);
      }
      if (issueData.parent_id) {
        // Use string path for proper Zustand reactivity
        lodashSet(newSubIssues, issueData.parent_id, concat(newSubIssues[issueData.parent_id], issueId));
      }

      set({ subIssues: newSubIssues });
    }

    // state update
    if (issueData.hasOwnProperty("state_id") && issueData.state_id !== oldIssue.state_id) {
      let oldIssueStateGroup: string | undefined = undefined;
      let issueStateGroup: string | undefined = undefined;

      if (oldIssue.state_id) {
        const stateObj = useStateStore.getState().getStateById(oldIssue.state_id);
        if (stateObj?.group) oldIssueStateGroup = stateObj.group;
      }

      if (issueData.state_id) {
        const stateObj = useStateStore.getState().getStateById(issueData.state_id);
        if (stateObj?.group) issueStateGroup = stateObj.group;
      }

      if (oldIssueStateGroup && issueStateGroup && issueStateGroup !== oldIssueStateGroup) {
        const newStateDistribution = clone(state.subIssuesStateDistribution);

        if (oldIssueStateGroup) {
          update(newStateDistribution, [parentIssueId, oldIssueStateGroup], (stateDistribution) => {
            if (!stateDistribution) return;
            return pull(stateDistribution, issueId);
          });
        }

        if (issueStateGroup) {
          update(newStateDistribution, [parentIssueId, issueStateGroup], (stateDistribution) => {
            if (!stateDistribution) return [issueId];
            return concat(stateDistribution, issueId);
          });
        }

        set({ subIssuesStateDistribution: newStateDistribution });
      }
    }
  },

  removeSubIssue: async (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => {
    const state = get();
    if (!state.rootIssueDetailStore) throw new Error("Root store not initialized");

    await state.rootIssueDetailStore.rootIssueStore.projectIssues.updateIssue(workspaceSlug, projectId, issueId, {
      parent_id: null,
    });

    const issue = state.rootIssueDetailStore.issue.getIssueById(issueId);
    if (issue && issue.state_id) {
      let issueStateGroup: string | undefined = undefined;
      const stateObj = useStateStore.getState().getStateById(issue.state_id);
      if (stateObj?.group) issueStateGroup = stateObj.group;

      if (issueStateGroup) {
        const newStateDistribution = clone(state.subIssuesStateDistribution);
        update(newStateDistribution, [parentIssueId, issueStateGroup], (stateDistribution) => {
          if (!stateDistribution) return;
          return pull(stateDistribution, issueId);
        });
        set({ subIssuesStateDistribution: newStateDistribution });
      }
    }

    const newSubIssues = clone(state.subIssues);
    pull(newSubIssues[parentIssueId], issueId);

    // update sub-issues_count of the parent issue
    const updatedIssuesMap = clone(state.rootIssueDetailStore.rootIssueStore.issues.issuesMap);
    // Use string path for proper Zustand reactivity
    lodashSet(updatedIssuesMap, `${parentIssueId}.sub_issues_count`, newSubIssues[parentIssueId]?.length);
    state.rootIssueDetailStore.rootIssueStore.issues.issuesMap = updatedIssuesMap;

    set({ subIssues: newSubIssues });
  },

  deleteSubIssue: async (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => {
    const state = get();
    if (!state.rootIssueDetailStore) throw new Error("Root store not initialized");

    await state.rootIssueDetailStore.rootIssueStore.projectIssues.removeIssue(workspaceSlug, projectId, issueId);

    const issue = state.rootIssueDetailStore.issue.getIssueById(issueId);
    if (issue && issue.state_id) {
      let issueStateGroup: string | undefined = undefined;
      const stateObj = useStateStore.getState().getStateById(issue.state_id);
      if (stateObj?.group) issueStateGroup = stateObj.group;

      if (issueStateGroup) {
        const newStateDistribution = clone(state.subIssuesStateDistribution);
        update(newStateDistribution, [parentIssueId, issueStateGroup], (stateDistribution) => {
          if (!stateDistribution) return;
          return pull(stateDistribution, issueId);
        });
        set({ subIssuesStateDistribution: newStateDistribution });
      }
    }

    const newSubIssues = clone(state.subIssues);
    pull(newSubIssues[parentIssueId], issueId);

    // update sub-issues_count of the parent issue
    const updatedIssuesMap = clone(state.rootIssueDetailStore.rootIssueStore.issues.issuesMap);
    // Use string path for proper Zustand reactivity
    lodashSet(updatedIssuesMap, `${parentIssueId}.sub_issues_count`, newSubIssues[parentIssueId]?.length);
    state.rootIssueDetailStore.rootIssueStore.issues.issuesMap = updatedIssuesMap;

    set({ subIssues: newSubIssues });
  },

  fetchOtherProjectProperties: async (workspaceSlug: string, projectIds: string[]) => {
    const state = get();
    if (!state.rootIssueDetailStore) return;

    if (projectIds.length > 0) {
      for (const projectId of projectIds) {
        // fetching other project states - migrated to TanStack Query, no need to fetch explicitly
        // fetching other project members
        state.rootIssueDetailStore.rootIssueStore.rootStore.memberRoot.project.fetchProjectMembers(
          workspaceSlug,
          projectId
        );
        // fetching other project labels - migrated to TanStack Query, no need to fetch explicitly
        // fetching other project sprints - migrated to TanStack Query, no need to fetch explicitly
        // state.rootIssueDetailStore.rootIssueStore.rootStore.sprint.fetchAllSprints(workspaceSlug, projectId);
        // fetching other project epics - migrated to TanStack Query, no need to fetch explicitly
        // fetching other project estimates
        state.rootIssueDetailStore.rootIssueStore.rootStore.projectEstimate.getProjectEstimates(
          workspaceSlug,
          projectId
        );
      }
    }
  },

  // Filter methods
  initializeFilters: (workItemId: string) => {
    const state = get();
    const newFilters = clone(state.subIssueFilters);
    // Use string paths for proper Zustand reactivity
    lodashSet(newFilters, `${workItemId}.displayProperties`, DEFAULT_DISPLAY_PROPERTIES);
    lodashSet(newFilters, `${workItemId}.filters`, {});
    lodashSet(newFilters, `${workItemId}.displayFilters`, {});
    set({ subIssueFilters: newFilters });
  },

  getSubIssueFilters: (workItemId: string) => {
    const state = get();
    if (!state.subIssueFilters[workItemId]) {
      get().initializeFilters(workItemId);
      return get().subIssueFilters[workItemId];
    }
    return state.subIssueFilters[workItemId];
  },

  updateSubWorkItemFilters: (
    filterType: EIssueFilterType,
    filters: IIssueDisplayFilterOptions | IIssueDisplayProperties | IIssueFilterOptions,
    workItemId: string
  ) => {
    const state = get();
    const newFilters = clone(state.subIssueFilters);
    updateSubWorkItemFilters(newFilters, filterType, filters, workItemId);
    set({ subIssueFilters: newFilters });
  },

  getGroupedSubWorkItems: (parentWorkItemId: string) => {
    const subIssueFilters = get().getSubIssueFilters(parentWorkItemId);
    const filteredWorkItems = get().getFilteredSubWorkItems(parentWorkItemId, subIssueFilters.filters ?? {});

    // get group by and order by
    const groupByKey = subIssueFilters.displayFilters?.group_by;
    const orderByKey = subIssueFilters.displayFilters?.order_by;

    const groupedWorkItemIds = getGroupedWorkItemIds(filteredWorkItems, groupByKey, orderByKey);

    return groupedWorkItemIds;
  },

  getFilteredSubWorkItems: (workItemId: string, filters: IIssueFilterOptions) => {
    const state = get();
    if (!state.rootIssueDetailStore) return [];

    const subIssueIds = get().subIssuesByIssueId(workItemId);
    const workItems = state.rootIssueDetailStore.rootIssueStore.issues.getIssuesByIds(subIssueIds ?? [], "un-archived");

    const filteredWorkItems = getFilteredWorkItems(workItems, filters);

    return filteredWorkItems;
  },

  resetFilters: (workItemId: string) => {
    get().initializeFilters(workItemId);
  },
}));

// Legacy interfaces for backward compatibility
export interface IIssueSubIssuesStoreActions {
  fetchSubIssues: (workspaceSlug: string, projectId: string, parentIssueId: string) => Promise<TIssueSubIssues>;
  createSubIssues: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueIds: string[]
  ) => Promise<void>;
  updateSubIssue: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    issueData: Partial<TIssue>,
    oldIssue?: Partial<TIssue>,
    fromModal?: boolean
  ) => Promise<void>;
  removeSubIssue: (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => Promise<void>;
  deleteSubIssue: (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => Promise<void>;
}

export interface IIssueSubIssuesStore extends IIssueSubIssuesStoreActions {
  // observables
  subIssuesStateDistribution: TIssueSubIssuesStateDistributionMap;
  subIssues: TIssueSubIssuesIdMap;
  subIssueHelpers: Record<string, TSubIssueHelpers>;
  loader: TLoader;
  filters: IWorkItemSubIssueFiltersStore;
  // helper methods
  stateDistributionByIssueId: (issueId: string) => TSubIssuesStateDistribution | undefined;
  subIssuesByIssueId: (issueId: string) => string[] | undefined;
  subIssueHelpersByIssueId: (issueId: string) => TSubIssueHelpers;
  // actions
  fetchOtherProjectProperties: (workspaceSlug: string, projectIds: string[]) => Promise<void>;
  setSubIssueHelpers: (parentIssueId: string, key: TSubIssueHelpersKeys, value: string) => void;
}

export interface IWorkItemSubIssueFiltersStore {
  subIssueFilters: Record<string, Partial<ISubWorkItemFilters>>;
  // helpers methods
  updateSubWorkItemFilters: (
    filterType: EIssueFilterType,
    filters: IIssueDisplayFilterOptions | IIssueDisplayProperties | IIssueFilterOptions,
    workItemId: string
  ) => void;
  getGroupedSubWorkItems: (workItemId: string) => TGroupedIssues;
  getFilteredSubWorkItems: (workItemId: string, filters: IIssueFilterOptions) => TIssue[];
  getSubIssueFilters: (workItemId: string) => Partial<ISubWorkItemFilters>;
  resetFilters: (workItemId: string) => void;
}

// Legacy class wrapper for backward compatibility
export class IssueSubIssuesStoreLegacy implements IIssueSubIssuesStore {
  private rootStore: IIssueDetail;
  private _filters: WorkItemSubIssueFiltersStoreLegacy;

  constructor(rootStore: IIssueDetail, serviceType: TIssueServiceType) {
    this.rootStore = rootStore;
    this._filters = new WorkItemSubIssueFiltersStoreLegacy();

    // Initialize the Zustand store
    useIssueSubIssuesStore.getState().initialize(rootStore, serviceType);
  }

  // Getters that delegate to Zustand store
  get subIssuesStateDistribution(): TIssueSubIssuesStateDistributionMap {
    return useIssueSubIssuesStore.getState().subIssuesStateDistribution;
  }

  get subIssues(): TIssueSubIssuesIdMap {
    return useIssueSubIssuesStore.getState().subIssues;
  }

  get subIssueHelpers(): Record<string, TSubIssueHelpers> {
    return useIssueSubIssuesStore.getState().subIssueHelpers;
  }

  get loader(): TLoader {
    return useIssueSubIssuesStore.getState().loader;
  }

  get filters(): IWorkItemSubIssueFiltersStore {
    return this._filters;
  }

  // Helper methods
  stateDistributionByIssueId = (issueId: string): TSubIssuesStateDistribution | undefined => {
    return useIssueSubIssuesStore.getState().stateDistributionByIssueId(issueId);
  };

  subIssuesByIssueId = (issueId: string): string[] | undefined => {
    return useIssueSubIssuesStore.getState().subIssuesByIssueId(issueId);
  };

  subIssueHelpersByIssueId = (issueId: string): TSubIssueHelpers => {
    return useIssueSubIssuesStore.getState().subIssueHelpersByIssueId(issueId);
  };

  // Action methods
  setSubIssueHelpers = (parentIssueId: string, key: TSubIssueHelpersKeys, value: string): void => {
    return useIssueSubIssuesStore.getState().setSubIssueHelpers(parentIssueId, key, value);
  };

  fetchSubIssues = async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string
  ): Promise<TIssueSubIssues> => {
    return useIssueSubIssuesStore.getState().fetchSubIssues(workspaceSlug, projectId, parentIssueId);
  };

  createSubIssues = async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueIds: string[]
  ): Promise<void> => {
    return useIssueSubIssuesStore.getState().createSubIssues(workspaceSlug, projectId, parentIssueId, issueIds);
  };

  updateSubIssue = async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    issueData: Partial<TIssue>,
    oldIssue: Partial<TIssue> = {},
    fromModal: boolean = false
  ): Promise<void> => {
    return useIssueSubIssuesStore
      .getState()
      .updateSubIssue(workspaceSlug, projectId, parentIssueId, issueId, issueData, oldIssue, fromModal);
  };

  removeSubIssue = async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string
  ): Promise<void> => {
    return useIssueSubIssuesStore.getState().removeSubIssue(workspaceSlug, projectId, parentIssueId, issueId);
  };

  deleteSubIssue = async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string
  ): Promise<void> => {
    return useIssueSubIssuesStore.getState().deleteSubIssue(workspaceSlug, projectId, parentIssueId, issueId);
  };

  fetchOtherProjectProperties = async (workspaceSlug: string, projectIds: string[]): Promise<void> => {
    return useIssueSubIssuesStore.getState().fetchOtherProjectProperties(workspaceSlug, projectIds);
  };
}

// Legacy filters class wrapper
export class WorkItemSubIssueFiltersStoreLegacy implements IWorkItemSubIssueFiltersStore {
  get subIssueFilters(): Record<string, Partial<ISubWorkItemFilters>> {
    return useIssueSubIssuesStore.getState().subIssueFilters;
  }

  updateSubWorkItemFilters = (
    filterType: EIssueFilterType,
    filters: IIssueDisplayFilterOptions | IIssueDisplayProperties | IIssueFilterOptions,
    workItemId: string
  ): void => {
    return useIssueSubIssuesStore.getState().updateSubWorkItemFilters(filterType, filters, workItemId);
  };

  getGroupedSubWorkItems = (workItemId: string): TGroupedIssues => {
    return useIssueSubIssuesStore.getState().getGroupedSubWorkItems(workItemId);
  };

  getFilteredSubWorkItems = (workItemId: string, filters: IIssueFilterOptions): TIssue[] => {
    return useIssueSubIssuesStore.getState().getFilteredSubWorkItems(workItemId, filters);
  };

  getSubIssueFilters = (workItemId: string): Partial<ISubWorkItemFilters> => {
    return useIssueSubIssuesStore.getState().getSubIssueFilters(workItemId);
  };

  resetFilters = (workItemId: string): void => {
    return useIssueSubIssuesStore.getState().resetFilters(workItemId);
  };
}

// Export legacy class for backward compatibility (WorkItemSubIssueFiltersStore only - IssueSubIssuesStore conflicts with type)
export { WorkItemSubIssueFiltersStoreLegacy as WorkItemSubIssueFiltersStore };

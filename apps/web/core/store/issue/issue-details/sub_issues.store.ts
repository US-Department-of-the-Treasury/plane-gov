import { pull, concat, uniq, set as lodashSet, update } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// Plane Imports
import type {
  TIssue,
  TIssueSubIssues,
  TIssueSubIssuesStateDistributionMap,
  TIssueSubIssuesIdMap,
  TSubIssuesStateDistribution,
  TIssueServiceType,
  TLoader,
} from "@plane/types";
// services
import { IssueService } from "@/services/issue";
type TSubIssueHelpersKeys = "issue_visibility" | "preview_loader" | "issue_loader";
type TSubIssueHelpers = Record<TSubIssueHelpersKeys, string[]>;

export interface IIssueSubIssuesStore {
  // state
  subIssuesStateDistribution: TIssueSubIssuesStateDistributionMap;
  subIssues: TIssueSubIssuesIdMap;
  subIssueHelpers: Record<string, TSubIssueHelpers>; // parent_issue_id -> TSubIssueHelpers
  loader: TLoader;
  // helper methods
  stateDistributionByIssueId: (issueId: string) => TSubIssuesStateDistribution | undefined;
  subIssuesByIssueId: (issueId: string) => string[] | undefined;
  subIssueHelpersByIssueId: (issueId: string) => TSubIssueHelpers;
  // actions
  setLoader: (loader: TLoader) => void;
  setSubIssueHelpers: (parentIssueId: string, key: TSubIssueHelpersKeys, value: string) => void;
  fetchSubIssues: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    onAddIssues?: (issues: TIssue[]) => void,
    onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void,
    onFetchProjectProperties?: (workspaceSlug: string, projectIds: string[]) => void
  ) => Promise<TIssueSubIssues>;
  createSubIssues: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueIds: string[],
    onAddIssues?: (issues: TIssue[]) => void,
    onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void,
    onFetchProjectProperties?: (workspaceSlug: string, projectIds: string[]) => void
  ) => Promise<void>;
  updateSubIssue: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    issueData: Partial<TIssue>,
    oldIssue?: Partial<TIssue>,
    fromModal?: boolean,
    onUpdateProjectIssue?: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>,
    getStateById?: (stateId: string) => { group?: string } | undefined
  ) => Promise<void>;
  removeSubIssue: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    onUpdateProjectIssue?: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>,
    getIssueById?: (issueId: string) => TIssue | undefined,
    getStateById?: (stateId: string) => { group?: string } | undefined,
    onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void
  ) => Promise<void>;
  deleteSubIssue: (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    onRemoveProjectIssue?: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>,
    getIssueById?: (issueId: string) => TIssue | undefined,
    getStateById?: (stateId: string) => { group?: string } | undefined,
    onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void
  ) => Promise<void>;
}

// Store factory for different service types
const subIssuesServiceMap = new Map<TIssueServiceType, IssueService>();

const getSubIssuesService = (serviceType: TIssueServiceType): IssueService => {
  if (!subIssuesServiceMap.has(serviceType)) {
    subIssuesServiceMap.set(serviceType, new IssueService(serviceType));
  }
  return subIssuesServiceMap.get(serviceType)!;
};

export const useIssueSubIssuesStore = create<IIssueSubIssuesStore>()(
  immer((set, get) => ({
    // state
    subIssuesStateDistribution: {},
    subIssues: {},
    subIssueHelpers: {},
    loader: undefined,

    // helper methods
    stateDistributionByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      return get().subIssuesStateDistribution[issueId] ?? undefined;
    },

    subIssuesByIssueId: (issueId: string) => get().subIssues[issueId],

    subIssueHelpersByIssueId: (issueId: string) => ({
      preview_loader: get().subIssueHelpers?.[issueId]?.preview_loader || [],
      issue_visibility: get().subIssueHelpers?.[issueId]?.issue_visibility || [],
      issue_loader: get().subIssueHelpers?.[issueId]?.issue_loader || [],
    }),

    // actions
    setLoader: (loader: TLoader) => {
      set((state) => {
        state.loader = loader;
      });
    },

    setSubIssueHelpers: (parentIssueId: string, key: TSubIssueHelpersKeys, value: string) => {
      if (!parentIssueId || !key || !value) return;

      set((state) => {
        if (!state.subIssueHelpers[parentIssueId]) {
          state.subIssueHelpers[parentIssueId] = {
            issue_visibility: [],
            preview_loader: [],
            issue_loader: [],
          };
        }
        const helpers = state.subIssueHelpers[parentIssueId][key] || [];
        if (helpers.includes(value)) {
          state.subIssueHelpers[parentIssueId][key] = helpers.filter((v) => v !== value);
        } else {
          state.subIssueHelpers[parentIssueId][key] = [...helpers, value];
        }
      });
    },

    fetchSubIssues: async (
      workspaceSlug: string,
      projectId: string,
      parentIssueId: string,
      onAddIssues?: (issues: TIssue[]) => void,
      onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void,
      onFetchProjectProperties?: (workspaceSlug: string, projectIds: string[]) => void
    ) => {
      const service = getSubIssuesService("WORKSPACE");

      set((state) => {
        state.loader = "init-loader";
      });

      const response = await service.subIssues(workspaceSlug, projectId, parentIssueId);
      const subIssuesStateDistribution = response?.state_distribution ?? {};
      const issueList = (response.sub_issues ?? []) as TIssue[];

      if (onAddIssues) {
        onAddIssues(issueList);
      }

      // fetch other issues states and members when sub-issues are from different project
      if (issueList && issueList.length > 0 && onFetchProjectProperties) {
        const otherProjectIds = uniq(
          issueList.map((issue) => issue.project_id).filter((id) => !!id && id !== projectId)
        ) as string[];
        onFetchProjectProperties(workspaceSlug, otherProjectIds);
      }

      if (issueList && onUpdateIssue) {
        onUpdateIssue(parentIssueId, {
          sub_issues_count: issueList.length,
        });
      }

      set((state) => {
        state.subIssuesStateDistribution[parentIssueId] = subIssuesStateDistribution;
        state.subIssues[parentIssueId] = issueList.map((issue) => issue.id);
        state.loader = undefined;
      });

      return response;
    },

    createSubIssues: async (
      workspaceSlug: string,
      projectId: string,
      parentIssueId: string,
      issueIds: string[],
      onAddIssues?: (issues: TIssue[]) => void,
      onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void,
      onFetchProjectProperties?: (workspaceSlug: string, projectIds: string[]) => void
    ) => {
      const service = getSubIssuesService("WORKSPACE");

      const response = await service.addSubIssues(workspaceSlug, projectId, parentIssueId, {
        sub_issue_ids: issueIds,
      });

      const subIssuesStateDistribution = response?.state_distribution;
      const subIssues = response.sub_issues as TIssue[];

      // fetch other issues states and members when sub-issues are from different project
      if (subIssues && subIssues.length > 0 && onFetchProjectProperties) {
        const otherProjectIds = uniq(
          subIssues.map((issue) => issue.project_id).filter((id) => !!id && id !== projectId)
        ) as string[];
        onFetchProjectProperties(workspaceSlug, otherProjectIds);
      }

      set((state) => {
        Object.keys(subIssuesStateDistribution).forEach((key) => {
          const stateGroup = key as keyof TSubIssuesStateDistribution;
          if (!state.subIssuesStateDistribution[parentIssueId]) {
            state.subIssuesStateDistribution[parentIssueId] = {};
          }
          const existing = state.subIssuesStateDistribution[parentIssueId][stateGroup] || [];
          state.subIssuesStateDistribution[parentIssueId][stateGroup] = concat(
            existing,
            subIssuesStateDistribution[stateGroup]
          );
        });

        const newIssueIds = subIssues.map((issue) => issue.id);
        if (!state.subIssues[parentIssueId]) {
          state.subIssues[parentIssueId] = [];
        }
        state.subIssues[parentIssueId] = concat(state.subIssues[parentIssueId], newIssueIds);
      });

      if (onAddIssues) {
        onAddIssues(subIssues);
      }

      // update sub-issues_count of the parent issue
      if (onUpdateIssue) {
        onUpdateIssue(parentIssueId, {
          sub_issues_count: get().subIssues[parentIssueId]?.length,
        });
      }
    },

    updateSubIssue: async (
      workspaceSlug: string,
      projectId: string,
      parentIssueId: string,
      issueId: string,
      issueData: Partial<TIssue>,
      oldIssue: Partial<TIssue> = {},
      fromModal: boolean = false,
      onUpdateProjectIssue?: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>,
      getStateById?: (stateId: string) => { group?: string } | undefined
    ) => {
      if (!fromModal && onUpdateProjectIssue) {
        await onUpdateProjectIssue(workspaceSlug, projectId, issueId, issueData);
      }

      // parent update
      if (issueData.hasOwnProperty("parent_id") && issueData.parent_id !== oldIssue.parent_id) {
        set((state) => {
          if (oldIssue.parent_id && state.subIssues[oldIssue.parent_id]) {
            state.subIssues[oldIssue.parent_id] = state.subIssues[oldIssue.parent_id].filter((id) => id !== issueId);
          }
          if (issueData.parent_id) {
            if (!state.subIssues[issueData.parent_id]) {
              state.subIssues[issueData.parent_id] = [];
            }
            state.subIssues[issueData.parent_id] = concat(state.subIssues[issueData.parent_id], issueId);
          }
        });
      }

      // state update
      if (issueData.hasOwnProperty("state_id") && issueData.state_id !== oldIssue.state_id && getStateById) {
        let oldIssueStateGroup: string | undefined = undefined;
        let issueStateGroup: string | undefined = undefined;

        if (oldIssue.state_id) {
          const state = getStateById(oldIssue.state_id);
          if (state?.group) oldIssueStateGroup = state.group;
        }

        if (issueData.state_id) {
          const state = getStateById(issueData.state_id);
          if (state?.group) issueStateGroup = state.group;
        }

        if (oldIssueStateGroup && issueStateGroup && issueStateGroup !== oldIssueStateGroup) {
          set((state) => {
            if (oldIssueStateGroup && state.subIssuesStateDistribution[parentIssueId]?.[oldIssueStateGroup]) {
              state.subIssuesStateDistribution[parentIssueId][oldIssueStateGroup] =
                state.subIssuesStateDistribution[parentIssueId][oldIssueStateGroup].filter((id) => id !== issueId);
            }

            if (issueStateGroup) {
              if (!state.subIssuesStateDistribution[parentIssueId]) {
                state.subIssuesStateDistribution[parentIssueId] = {};
              }
              if (!state.subIssuesStateDistribution[parentIssueId][issueStateGroup]) {
                state.subIssuesStateDistribution[parentIssueId][issueStateGroup] = [];
              }
              state.subIssuesStateDistribution[parentIssueId][issueStateGroup] = concat(
                state.subIssuesStateDistribution[parentIssueId][issueStateGroup],
                issueId
              );
            }
          });
        }
      }
    },

    removeSubIssue: async (
      workspaceSlug: string,
      projectId: string,
      parentIssueId: string,
      issueId: string,
      onUpdateProjectIssue?: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>,
      getIssueById?: (issueId: string) => TIssue | undefined,
      getStateById?: (stateId: string) => { group?: string } | undefined,
      onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void
    ) => {
      if (onUpdateProjectIssue) {
        await onUpdateProjectIssue(workspaceSlug, projectId, issueId, {
          parent_id: null,
        });
      }

      const issue = getIssueById ? getIssueById(issueId) : undefined;
      if (issue && issue.state_id && getStateById) {
        let issueStateGroup: string | undefined = undefined;
        const state = getStateById(issue.state_id);
        if (state?.group) issueStateGroup = state.group;

        if (issueStateGroup) {
          set((draft) => {
            if (issueStateGroup && draft.subIssuesStateDistribution[parentIssueId]?.[issueStateGroup]) {
              draft.subIssuesStateDistribution[parentIssueId][issueStateGroup] =
                draft.subIssuesStateDistribution[parentIssueId][issueStateGroup].filter((id) => id !== issueId);
            }
          });
        }
      }

      set((state) => {
        if (state.subIssues[parentIssueId]) {
          state.subIssues[parentIssueId] = state.subIssues[parentIssueId].filter((id) => id !== issueId);
        }
      });

      // update sub-issues_count of the parent issue
      if (onUpdateIssue) {
        onUpdateIssue(parentIssueId, {
          sub_issues_count: get().subIssues[parentIssueId]?.length,
        });
      }
    },

    deleteSubIssue: async (
      workspaceSlug: string,
      projectId: string,
      parentIssueId: string,
      issueId: string,
      onRemoveProjectIssue?: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>,
      getIssueById?: (issueId: string) => TIssue | undefined,
      getStateById?: (stateId: string) => { group?: string } | undefined,
      onUpdateIssue?: (issueId: string, data: Partial<TIssue>) => void
    ) => {
      if (onRemoveProjectIssue) {
        await onRemoveProjectIssue(workspaceSlug, projectId, issueId);
      }

      const issue = getIssueById ? getIssueById(issueId) : undefined;
      if (issue && issue.state_id && getStateById) {
        let issueStateGroup: string | undefined = undefined;
        const state = getStateById(issue.state_id);
        if (state?.group) issueStateGroup = state.group;

        if (issueStateGroup) {
          set((draft) => {
            if (issueStateGroup && draft.subIssuesStateDistribution[parentIssueId]?.[issueStateGroup]) {
              draft.subIssuesStateDistribution[parentIssueId][issueStateGroup] =
                draft.subIssuesStateDistribution[parentIssueId][issueStateGroup].filter((id) => id !== issueId);
            }
          });
        }
      }

      set((state) => {
        if (state.subIssues[parentIssueId]) {
          state.subIssues[parentIssueId] = state.subIssues[parentIssueId].filter((id) => id !== issueId);
        }
      });

      // update sub-issues_count of the parent issue
      if (onUpdateIssue) {
        onUpdateIssue(parentIssueId, {
          sub_issues_count: get().subIssues[parentIssueId]?.length,
        });
      }
    },
  }))
);

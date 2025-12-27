import { clone, update, unset, orderBy, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import { EDraftIssuePaginationType } from "@plane/constants";
import type {
  TWorkspaceDraftIssue,
  TWorkspaceDraftPaginationInfo,
  TWorkspaceDraftIssueLoader,
  TWorkspaceDraftQueryParams,
  TPaginationData,
  TLoader,
  TGroupedIssues,
  TSubGroupedIssues,
  ViewFlags,
  TIssue,
  TBulkOperationsPayload,
} from "@plane/types";
import { getCurrentDateTimeInISO, convertToISODateString } from "@plane/utils";
// services
import workspaceDraftService from "@/services/issue/workspace_draft.service";
// types
import type { IIssueRootStore } from "../root.store";

export type TDraftIssuePaginationType = EDraftIssuePaginationType;

export interface IWorkspaceDraftIssues {
  // observables
  loader: TWorkspaceDraftIssueLoader;
  paginationInfo: Omit<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>, "results"> | undefined;
  issuesMap: Record<string, TWorkspaceDraftIssue>; // issue_id -> issue;
  issueMapIds: Record<string, string[]>; // workspace_id -> issue_ids;
  // computed
  issueIds: string[];
  // computed functions
  getIssueById: (issueId: string) => TWorkspaceDraftIssue | undefined;
  // helper actions
  addIssue: (issues: TWorkspaceDraftIssue[]) => void;
  mutateIssue: (issueId: string, data: Partial<TWorkspaceDraftIssue>) => void;
  removeIssue: (issueId: string) => Promise<void>;
  // actions
  fetchIssues: (
    workspaceSlug: string,
    loadType: TWorkspaceDraftIssueLoader,
    paginationType?: TDraftIssuePaginationType
  ) => Promise<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue> | undefined>;
  createIssue: (
    workspaceSlug: string,
    payload: Partial<TWorkspaceDraftIssue | TIssue>
  ) => Promise<TWorkspaceDraftIssue | undefined>;
  updateIssue: (
    workspaceSlug: string,
    issueId: string,
    payload: Partial<TWorkspaceDraftIssue | TIssue>
  ) => Promise<TWorkspaceDraftIssue | undefined>;
  deleteIssue: (workspaceSlug: string, issueId: string) => Promise<void>;
  moveIssue: (workspaceSlug: string, issueId: string, payload: Partial<TWorkspaceDraftIssue>) => Promise<TIssue>;
  addSprintToIssue: (
    workspaceSlug: string,
    issueId: string,
    sprintId: string
  ) => Promise<TWorkspaceDraftIssue | undefined>;
  addEpicsToIssue: (
    workspaceSlug: string,
    issueId: string,
    epicIds: string[]
  ) => Promise<TWorkspaceDraftIssue | undefined>;

  // dummies
  viewFlags: ViewFlags;
  groupedIssueIds: TGroupedIssues | TSubGroupedIssues | undefined;
  getIssueIds: (groupId?: string, subGroupId?: string) => string[] | undefined;
  getPaginationData(groupId: string | undefined, subGroupId: string | undefined): TPaginationData | undefined;
  getIssueLoader(groupId?: string, subGroupId?: string): TLoader;
  getGroupIssueCount: (
    groupId: string | undefined,
    subGroupId: string | undefined,
    isSubGroupCumulative: boolean
  ) => number | undefined;
  removeSprintFromIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  addIssueToSprint: (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    issueIds: string[],
    fetchAddedIssues?: boolean
  ) => Promise<void>;
  removeIssueFromSprint: (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => Promise<void>;

  removeIssuesFromEpic: (workspaceSlug: string, projectId: string, epicId: string, issueIds: string[]) => Promise<void>;
  changeEpicsInIssue(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    addEpicIds: string[],
    removeEpicIds: string[]
  ): Promise<void>;
  archiveIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  archiveBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  removeBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  bulkUpdateProperties: (workspaceSlug: string, projectId: string, data: TBulkOperationsPayload) => Promise<void>;
}

// Zustand Store
interface WorkspaceDraftIssuesState {
  loader: TWorkspaceDraftIssueLoader;
  paginationInfo: Omit<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>, "results"> | undefined;
  issuesMap: Record<string, TWorkspaceDraftIssue>;
  issueMapIds: Record<string, string[]>;
}

interface WorkspaceDraftIssuesActions {
  setLoader: (loader: TWorkspaceDraftIssueLoader) => void;
  setPaginationInfo: (info: Omit<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>, "results"> | undefined) => void;
  addIssues: (issues: TWorkspaceDraftIssue[]) => void;
  updateIssue: (issueId: string, issue: Partial<TWorkspaceDraftIssue>) => void;
  deleteIssue: (issueId: string) => void;
  addIssueToMapIds: (workspaceSlug: string, issueIds: string[]) => void;
  updateIssueMapIds: (workspaceSlug: string, issueIds: string[]) => void;
  removeIssueFromMapIds: (workspaceSlug: string, issueId: string) => void;
}

type WorkspaceDraftIssuesStore = WorkspaceDraftIssuesState & WorkspaceDraftIssuesActions;

export const useWorkspaceDraftIssuesStore = create<WorkspaceDraftIssuesStore>()(
  immer((set) => ({
    // State
    loader: undefined,
    paginationInfo: undefined,
    issuesMap: {},
    issueMapIds: {},

    // Actions
    setLoader: (loader) => {
      set((state) => {
        state.loader = loader;
      });
    },

    setPaginationInfo: (info) => {
      set((state) => {
        state.paginationInfo = info;
      });
    },

    addIssues: (issues) => {
      set((state) => {
        issues.forEach((issue) => {
          if (!state.issuesMap[issue.id]) {
            state.issuesMap[issue.id] = issue;
          } else {
            state.issuesMap[issue.id] = { ...state.issuesMap[issue.id], ...issue };
          }
        });
      });
    },

    updateIssue: (issueId, issue) => {
      set((state) => {
        if (state.issuesMap[issueId]) {
          state.issuesMap[issueId] = {
            ...state.issuesMap[issueId],
            ...issue,
            updated_at: getCurrentDateTimeInISO(),
          };
        }
      });
    },

    deleteIssue: (issueId) => {
      set((state) => {
        delete state.issuesMap[issueId];
      });
    },

    addIssueToMapIds: (workspaceSlug, issueIds) => {
      set((state) => {
        const existingIds = state.issueMapIds[workspaceSlug] || [];
        state.issueMapIds[workspaceSlug] = [...issueIds, ...existingIds];
      });
    },

    updateIssueMapIds: (workspaceSlug, issueIds) => {
      set((state) => {
        state.issueMapIds[workspaceSlug] = issueIds;
      });
    },

    removeIssueFromMapIds: (workspaceSlug, issueId) => {
      set((state) => {
        if (state.issueMapIds[workspaceSlug]) {
          state.issueMapIds[workspaceSlug] = state.issueMapIds[workspaceSlug].filter((id) => id !== issueId);
        }
      });
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class WorkspaceDraftIssues implements IWorkspaceDraftIssues {
  // local constants
  paginatedCount = 50;
  // issue store reference
  issueStore: IIssueRootStore;

  constructor(issueStore: IIssueRootStore) {
    this.issueStore = issueStore;
  }

  private get store() {
    return useWorkspaceDraftIssuesStore.getState();
  }

  get loader() {
    return this.store.loader;
  }

  set loader(value: TWorkspaceDraftIssueLoader) {
    this.store.setLoader(value);
  }

  get paginationInfo() {
    return this.store.paginationInfo;
  }

  set paginationInfo(value: Omit<TWorkspaceDraftPaginationInfo<TWorkspaceDraftIssue>, "results"> | undefined) {
    this.store.setPaginationInfo(value);
  }

  get issuesMap() {
    return this.store.issuesMap;
  }

  get issueMapIds() {
    return this.store.issueMapIds;
  }

  private updateWorkspaceUserDraftIssueCount(workspaceSlug: string, increment: number) {
    const workspaceUserInfo = this.issueStore.rootStore.user.permission.workspaceUserInfo;
    const currentCount = workspaceUserInfo[workspaceSlug]?.draft_issue_count ?? 0;

    // Use string path for proper reactivity
    lodashSet(workspaceUserInfo, `${workspaceSlug}.draft_issue_count`, currentCount + increment);
  }

  // computed
  get issueIds() {
    const workspaceSlug = this.issueStore.workspaceSlug;
    if (!workspaceSlug) return [];
    if (!this.issueMapIds[workspaceSlug]) return [];
    const issueIds = this.issueMapIds[workspaceSlug];
    return orderBy(issueIds, (issueId) => convertToISODateString(this.issuesMap[issueId]?.created_at), ["desc"]);
  }

  // computed functions
  getIssueById = (issueId: string) => {
    if (!issueId || !this.issuesMap[issueId]) return undefined;
    return this.issuesMap[issueId];
  };

  // helper actions
  addIssue = (issues: TWorkspaceDraftIssue[]) => {
    if (issues && issues.length <= 0) return;
    this.store.addIssues(issues);
  };

  mutateIssue = (issueId: string, issue: Partial<TWorkspaceDraftIssue>) => {
    if (!issue || !issueId || !this.issuesMap[issueId]) return;
    this.store.updateIssue(issueId, issue);
  };

  removeIssue = async (issueId: string) => {
    if (!issueId || !this.issuesMap[issueId]) return;
    this.store.deleteIssue(issueId);
  };

  generateNotificationQueryParams = (
    paramType: TDraftIssuePaginationType,
    filterParams = {}
  ): TWorkspaceDraftQueryParams => {
    const queryCursorNext: string =
      paramType === EDraftIssuePaginationType.INIT
        ? `${this.paginatedCount}:0:0`
        : paramType === EDraftIssuePaginationType.CURRENT
          ? `${this.paginatedCount}:${0}:0`
          : paramType === EDraftIssuePaginationType.NEXT && this.paginationInfo
            ? (this.paginationInfo?.next_cursor ?? `${this.paginatedCount}:${0}:0`)
            : `${this.paginatedCount}:${0}:0`;

    const queryParams: TWorkspaceDraftQueryParams = {
      per_page: this.paginatedCount,
      cursor: queryCursorNext,
      ...filterParams,
    };

    return queryParams;
  };

  // actions
  fetchIssues = async (
    workspaceSlug: string,
    loadType: TWorkspaceDraftIssueLoader,
    paginationType: TDraftIssuePaginationType = EDraftIssuePaginationType.INIT
  ) => {
    try {
      this.loader = loadType;

      // filter params and pagination params
      const filterParams = {};
      const params = this.generateNotificationQueryParams(paginationType, filterParams);

      // fetching the paginated workspace draft issues
      const draftIssuesResponse = await workspaceDraftService.getIssues(workspaceSlug, { ...params });
      if (!draftIssuesResponse) return undefined;

      const { results, ...paginationInfo } = draftIssuesResponse;
      if (results && results.length > 0) {
        // adding issueIds
        const issueIds = results.map((issue) => issue.id);
        const existingIssueIds = this.issueMapIds[workspaceSlug] ?? [];
        // new issueIds
        const newIssueIds = issueIds.filter((issueId) => !existingIssueIds.includes(issueId));
        this.addIssue(results);
        // issue map update
        this.store.addIssueToMapIds(workspaceSlug, newIssueIds);
        this.loader = undefined;
      } else {
        this.loader = "empty-state";
      }
      this.paginationInfo = paginationInfo;
      return draftIssuesResponse;
    } catch (error) {
      // set loader to undefined if errored out
      this.loader = undefined;
      throw error;
    }
  };

  createIssue = async (
    workspaceSlug: string,
    payload: Partial<TWorkspaceDraftIssue | TIssue>
  ): Promise<TWorkspaceDraftIssue | undefined> => {
    try {
      this.loader = "create";

      const response = await workspaceDraftService.createIssue(workspaceSlug, payload);
      if (response) {
        this.addIssue([response]);
        this.store.addIssueToMapIds(workspaceSlug, [response.id]);
        // increase the count of issues in the pagination info
        if (this.paginationInfo?.total_count) {
          this.paginationInfo = {
            ...this.paginationInfo,
            total_count: this.paginationInfo.total_count + 1,
          };
        }
        // Update draft issue count in workspaceUserInfo
        this.updateWorkspaceUserDraftIssueCount(workspaceSlug, 1);
      }

      this.loader = undefined;
      return response;
    } catch (error) {
      this.loader = undefined;
      throw error;
    }
  };

  updateIssue = async (workspaceSlug: string, issueId: string, payload: Partial<TWorkspaceDraftIssue | TIssue>) => {
    const issueBeforeUpdate = clone(this.getIssueById(issueId));
    try {
      this.loader = "update";
      this.store.updateIssue(issueId, {
        ...payload as Partial<TWorkspaceDraftIssue>,
        updated_at: getCurrentDateTimeInISO(),
      });
      const response = await workspaceDraftService.updateIssue(workspaceSlug, issueId, payload);
      this.loader = undefined;
      return response;
    } catch (error) {
      this.loader = undefined;
      if (issueBeforeUpdate) {
        this.store.addIssues([issueBeforeUpdate]);
      }
      throw error;
    }
  };

  deleteIssue = async (workspaceSlug: string, issueId: string) => {
    try {
      this.loader = "delete";

      const response = await workspaceDraftService.deleteIssue(workspaceSlug, issueId);
      // Remove the issue from the issueMapIds
      this.store.removeIssueFromMapIds(workspaceSlug, issueId);
      // Remove the issue from the issuesMap
      this.store.deleteIssue(issueId);
      // reduce the count of issues in the pagination info
      if (this.paginationInfo?.total_count) {
        this.paginationInfo = {
          ...this.paginationInfo,
          total_count: this.paginationInfo.total_count - 1,
        };
      }
      // Update draft issue count in workspaceUserInfo
      this.updateWorkspaceUserDraftIssueCount(workspaceSlug, -1);

      this.loader = undefined;
      return response;
    } catch (error) {
      this.loader = undefined;
      throw error;
    }
  };

  moveIssue = async (workspaceSlug: string, issueId: string, payload: Partial<TWorkspaceDraftIssue>) => {
    try {
      this.loader = "move";

      const response = await workspaceDraftService.moveIssue(workspaceSlug, issueId, payload);
      // Remove the issue from the issueMapIds
      this.store.removeIssueFromMapIds(workspaceSlug, issueId);
      // Remove the issue from the issuesMap
      this.store.deleteIssue(issueId);
      // reduce the count of issues in the pagination info
      if (this.paginationInfo?.total_count) {
        this.paginationInfo = {
          ...this.paginationInfo,
          total_count: this.paginationInfo.total_count - 1,
        };
      }

      // Update draft issue count in workspaceUserInfo
      this.updateWorkspaceUserDraftIssueCount(workspaceSlug, -1);

      this.loader = undefined;
      return response;
    } catch (error) {
      this.loader = undefined;
      throw error;
    }
  };

  addSprintToIssue = async (workspaceSlug: string, issueId: string, sprintId: string) => {
    try {
      this.loader = "update";
      const response = await this.updateIssue(workspaceSlug, issueId, { sprint_id: sprintId });
      return response;
    } catch (error) {
      this.loader = undefined;
      throw error;
    }
  };

  addEpicsToIssue = async (workspaceSlug: string, issueId: string, epicIds: string[]) => {
    try {
      this.loader = "update";
      const response = this.updateIssue(workspaceSlug, issueId, { epic_ids: epicIds });
      return response;
    } catch (error) {
      this.loader = undefined;
      throw error;
    }
  };

  // dummies
  viewFlags: ViewFlags = { enableQuickAdd: false, enableIssueCreation: false, enableInlineEditing: false };
  groupedIssueIds: TGroupedIssues | TSubGroupedIssues | undefined = undefined;
  getIssueIds = (groupId?: string, subGroupId?: string) => undefined;
  getPaginationData = (groupId: string | undefined, subGroupId: string | undefined) => undefined;
  getIssueLoader = (groupId?: string, subGroupId?: string) => "loaded" as TLoader;
  getGroupIssueCount = (groupId: string | undefined, subGroupId: string | undefined, isSubGroupCumulative: boolean) =>
    undefined;
  removeSprintFromIssue = async (workspaceSlug: string, projectId: string, issueId: string) => {};
  addIssueToSprint = async (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    issueIds: string[],
    fetchAddedIssues?: boolean
  ) => {};
  removeIssueFromSprint = async (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) => {};

  removeIssuesFromEpic = async (workspaceSlug: string, projectId: string, epicId: string, issueIds: string[]) => {};
  changeEpicsInIssue = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    addEpicIds: string[],
    removeEpicIds: string[]
  ) => {};
  archiveIssue = async (workspaceSlug: string, projectId: string, issueId: string) => {};
  archiveBulkIssues = async (workspaceSlug: string, projectId: string, issueIds: string[]) => {};
  removeBulkIssues = async (workspaceSlug: string, projectId: string, issueIds: string[]) => {};
  bulkUpdateProperties = async (workspaceSlug: string, projectId: string, data: TBulkOperationsPayload) => {};
}

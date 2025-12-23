import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// base class
import type { TLoader, IssuePaginationOptions, TIssuesResponse, ViewFlags, TBulkOperationsPayload } from "@plane/types";
// services
// types
import type { IBaseIssuesStore } from "../helpers/base-issues.store";
import { BaseIssuesStore } from "../helpers/base-issues.store";
import type { IIssueRootStore } from "../root.store";
import type { IArchivedIssuesFilter } from "./filter.store";

export interface IArchivedIssues extends IBaseIssuesStore {
  // observable
  viewFlags: ViewFlags;
  // actions
  fetchIssues: (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    option: IssuePaginationOptions
  ) => Promise<TIssuesResponse | undefined>;
  fetchIssuesWithExistingPagination: (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader
  ) => Promise<TIssuesResponse | undefined>;
  fetchNextIssues: (
    workspaceSlug: string,
    projectId: string,
    groupId?: string,
    subGroupId?: string
  ) => Promise<TIssuesResponse | undefined>;

  restoreIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  removeBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  bulkUpdateProperties: (workspaceSlug: string, projectId: string, data: TBulkOperationsPayload) => Promise<void>;

  updateIssue: undefined;
  archiveIssue: undefined;
  archiveBulkIssues: undefined;
  quickAddIssue: undefined;
}

interface ArchivedIssuesState {
  viewFlags: ViewFlags;
}

interface ArchivedIssuesActions {
  fetchParentStats: (workspaceSlug: string, projectId?: string, rootIssueStore?: IIssueRootStore) => Promise<void>;
  updateParentStats: () => void;
}

type ArchivedIssuesStore = ArchivedIssuesState & ArchivedIssuesActions;

export const useArchivedIssuesStore = create<ArchivedIssuesStore>()(
  immer((set, get) => ({
    viewFlags: {
      enableQuickAdd: false,
      enableIssueCreation: false,
      enableInlineEditing: true,
    },

    fetchParentStats: async (workspaceSlug, projectId, rootIssueStore) => {
      projectId && rootIssueStore?.rootStore.projectRoot.project.fetchProjectDetails(workspaceSlug, projectId);
    },

    updateParentStats: () => {},
  }))
);

// Legacy class wrapper
export class ArchivedIssues extends BaseIssuesStore implements IArchivedIssues {
  issueFilterStore: IArchivedIssuesFilter;

  private get state() {
    return useArchivedIssuesStore.getState();
  }

  get viewFlags() {
    return this.state.viewFlags;
  }

  constructor(_rootStore: IIssueRootStore, issueFilterStore: IArchivedIssuesFilter) {
    super(_rootStore, issueFilterStore, true);
    this.issueFilterStore = issueFilterStore;
  }

  fetchParentStats = async (workspaceSlug: string, projectId?: string) => {
    return this.state.fetchParentStats(workspaceSlug, projectId, this.rootIssueStore);
  };

  updateParentStats = () => {
    return this.state.updateParentStats();
  };

  fetchIssues = async (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader = "init-loader",
    options: IssuePaginationOptions,
    isExistingPaginationOptions: boolean = false
  ) => {
    try {
      this.setLoader(loadType);
      this.clear(!isExistingPaginationOptions);

      const params = this.issueFilterStore?.getFilterParams(options, projectId, undefined, undefined, undefined);
      const response = await this.issueArchiveService.getArchivedIssues(workspaceSlug, projectId, params, {
        signal: this.controller.signal,
      });

      this.onfetchIssues(response, options, workspaceSlug, projectId, undefined, !isExistingPaginationOptions);
      return response;
    } catch (error) {
      this.setLoader(undefined);
      throw error;
    }
  };

  fetchNextIssues = async (workspaceSlug: string, projectId: string, groupId?: string, subGroupId?: string) => {
    const cursorObject = this.getPaginationData(groupId, subGroupId);
    if (!this.paginationOptions || (cursorObject && !cursorObject?.nextPageResults)) return;
    try {
      this.setLoader("pagination", groupId, subGroupId);

      const params = this.issueFilterStore?.getFilterParams(
        this.paginationOptions,
        projectId,
        this.getNextCursor(groupId, subGroupId),
        groupId,
        subGroupId
      );
      const response = await this.issueArchiveService.getArchivedIssues(workspaceSlug, projectId, params);

      this.onfetchNexIssues(response, groupId, subGroupId);
      return response;
    } catch (error) {
      this.setLoader(undefined, groupId, subGroupId);
      throw error;
    }
  };

  fetchIssuesWithExistingPagination = async (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader = "mutation"
  ) => {
    if (!this.paginationOptions) return;
    return await this.fetchIssues(workspaceSlug, projectId, loadType, this.paginationOptions, true);
  };

  restoreIssue = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const response = await this.issueArchiveService.restoreIssue(workspaceSlug, projectId, issueId);

    this.rootIssueStore.issues.updateIssue(issueId, {
      archived_at: null,
    });
    this.removeIssueFromList(issueId);

    return response;
  };

  updateIssue = undefined;
  archiveIssue = undefined;
  archiveBulkIssues = undefined;
  quickAddIssue = undefined;
}

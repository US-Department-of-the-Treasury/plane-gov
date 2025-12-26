// base class
import type {
  TIssue,
  TLoader,
  ViewFlags,
  IssuePaginationOptions,
  TIssuesResponse,
  TBulkOperationsPayload,
} from "@plane/types";
// helpers
import { getDistributionPathsPostUpdate } from "@plane/utils";
import type { IBaseIssuesStore } from "../helpers/base-issues.store";
import { BaseIssuesStore } from "../helpers/base-issues.store";
// Zustand stores
import { useStateStore } from "@/store/client";
//
import type { IIssueRootStore } from "../root.store";
import type { IEpicIssuesFilter } from "./filter.store";

export interface IEpicIssues extends IBaseIssuesStore {
  viewFlags: ViewFlags;
  // actions
  getIssueIds: (groupId?: string, subGroupId?: string) => string[] | undefined;
  fetchIssues: (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    options: IssuePaginationOptions,
    epicId: string
  ) => Promise<TIssuesResponse | undefined>;
  fetchIssuesWithExistingPagination: (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    epicId: string
  ) => Promise<TIssuesResponse | undefined>;
  fetchNextIssues: (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    groupId?: string,
    subGroupId?: string
  ) => Promise<TIssuesResponse | undefined>;

  createIssue: (workspaceSlug: string, projectId: string, data: Partial<TIssue>, epicId: string) => Promise<TIssue>;
  updateIssue: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>;
  archiveIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  quickAddIssue: (
    workspaceSlug: string,
    projectId: string,
    data: TIssue,
    epicId: string
  ) => Promise<TIssue | undefined>;
  removeBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  archiveBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  bulkUpdateProperties: (workspaceSlug: string, projectId: string, data: TBulkOperationsPayload) => Promise<void>;
}

export class EpicIssues extends BaseIssuesStore implements IEpicIssues {
  viewFlags = {
    enableQuickAdd: true,
    enableIssueCreation: true,
    enableInlineEditing: true,
  };
  // filter store
  issueFilterStore: IEpicIssuesFilter;

  constructor(_rootStore: IIssueRootStore, issueFilterStore: IEpicIssuesFilter) {
    super(_rootStore, issueFilterStore);
    // filter store
    this.issueFilterStore = issueFilterStore;
  }

  /**
   * Fetches the epic details
   * @param workspaceSlug
   * @param projectId
   * @param id is the epic Id
   */
  fetchParentStats = (workspaceSlug: string, projectId?: string, id?: string) => {
    const epicId = id ?? this.epicId;
    projectId && epicId && this.rootIssueStore.rootStore.epic.fetchEpicDetails(workspaceSlug, projectId, epicId);
  };

  /**
   * Update Parent stats before fetching from server
   * @param prevIssueState
   * @param nextIssueState
   * @param id
   */
  updateParentStats = (prevIssueState?: TIssue, nextIssueState?: TIssue, id?: string) => {
    try {
      // get distribution updates
      const distributionUpdates = getDistributionPathsPostUpdate(
        prevIssueState,
        nextIssueState,
        useStateStore.getState().stateMap,
        this.rootIssueStore.rootStore.projectEstimate?.currentActiveEstimate?.estimatePointById
      );

      const epicId = id ?? this.epicId;

      epicId && this.rootIssueStore.rootStore.epic.updateEpicDistribution(distributionUpdates, epicId);
    } catch (e) {
      console.warn("could not update epic statistics");
    }
  };

  /**
   * This method is called to fetch the first issues of pagination
   * @param workspaceSlug
   * @param projectId
   * @param loadType
   * @param options
   * @param epicId
   * @returns
   */
  fetchIssues = async (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    options: IssuePaginationOptions,
    epicId: string,
    isExistingPaginationOptions: boolean = false
  ) => {
    try {
      // atomically clear store and set loader to prevent flash of empty state
      this.clearAndSetLoader(loadType, !isExistingPaginationOptions);

      // get params from pagination options
      const params = this.issueFilterStore?.getFilterParams(options, epicId, undefined, undefined, undefined);
      // call the fetch issues API with the params
      const response = await this.issueService.getIssues(workspaceSlug, projectId, params, {
        signal: this.controller.signal,
      });

      // after fetching issues, call the base method to process the response further
      this.onfetchIssues(response, options, workspaceSlug, projectId, epicId, !isExistingPaginationOptions);
      return response;
    } catch (error) {
      // set loader to undefined once errored out
      this.setLoader(undefined);
      throw error;
    }
  };

  /**
   * This method is called subsequent pages of pagination
   * if groupId/subgroupId is provided, only that specific group's next page is fetched
   * else all the groups' next page is fetched
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @param groupId
   * @param subGroupId
   * @returns
   */
  fetchNextIssues = async (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    groupId?: string,
    subGroupId?: string
  ) => {
    const cursorObject = this.getPaginationData(groupId, subGroupId);
    // if there are no pagination options and the next page results do not exist the return
    if (!this.paginationOptions || (cursorObject && !cursorObject?.nextPageResults)) return;
    try {
      // set Loader
      this.setLoader("pagination", groupId, subGroupId);

      // get params from stored pagination options
      const params = this.issueFilterStore?.getFilterParams(
        this.paginationOptions,
        epicId,
        this.getNextCursor(groupId, subGroupId),
        groupId,
        subGroupId
      );
      // call the fetch issues API with the params for next page in issues
      const response = await this.issueService.getIssues(workspaceSlug, projectId, params);

      // after the next page of issues are fetched, call the base method to process the response
      this.onfetchNexIssues(response, groupId, subGroupId);
      return response;
    } catch (error) {
      // set Loader as undefined if errored out
      this.setLoader(undefined, groupId, subGroupId);
      throw error;
    }
  };

  /**
   * This Method exists to fetch the first page of the issues with the existing stored pagination
   * This is useful for refetching when filters, groupBy, orderBy etc changes
   * @param workspaceSlug
   * @param projectId
   * @param loadType
   * @param epicId
   * @returns
   */
  fetchIssuesWithExistingPagination = async (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    epicId: string
  ) => {
    if (!this.paginationOptions) return;
    return await this.fetchIssues(workspaceSlug, projectId, loadType, this.paginationOptions, epicId, true);
  };

  /**
   * Override inherited create issue, to also add issue to epic
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @param epicId
   * @returns
   */
  override createIssue = async (workspaceSlug: string, projectId: string, data: Partial<TIssue>, epicId: string) => {
    try {
      const response = await super.createIssue(workspaceSlug, projectId, data, epicId, false);
      const epicIds = data.epic_ids && data.epic_ids.length > 1 ? data.epic_ids : [epicId];
      await this.addEpicsToIssue(workspaceSlug, projectId, response.id, epicIds);

      return response;
    } catch (error) {
      throw error;
    }
  };

  /**
   * This Method overrides the base quickAdd issue
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @param epicId
   * @returns
   */
  quickAddIssue = async (workspaceSlug: string, projectId: string, data: TIssue, epicId: string) => {
    try {
      // add temporary issue to store list
      this.addIssue(data);

      // call overridden create issue
      const response = await this.createIssue(workspaceSlug, projectId, data, epicId);

      // remove temp Issue from store list
      this.removeIssueFromList(data.id);
      this.rootIssueStore.issues.removeIssue(data.id);

      const currentSprintId = data.sprint_id !== "" && data.sprint_id === "None" ? undefined : data.sprint_id;

      if (currentSprintId) {
        await this.addSprintToIssue(workspaceSlug, projectId, currentSprintId, response.id);
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  // Using aliased names as they cannot be overridden in other stores
  archiveBulkIssues = this.bulkArchiveIssues;
  updateIssue = this.issueUpdate;
  archiveIssue = this.issueArchive;
}

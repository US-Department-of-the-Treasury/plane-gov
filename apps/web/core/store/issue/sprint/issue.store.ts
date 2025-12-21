import { get, set, concat, uniq, update } from "lodash-es";
import { action, observable, makeObservable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// plane imports
import { ALL_ISSUES } from "@plane/constants";
import type {
  TIssue,
  TLoader,
  IssuePaginationOptions,
  TIssuesResponse,
  ViewFlags,
  TBulkOperationsPayload,
} from "@plane/types";
// helpers
import { getDistributionPathsPostUpdate } from "@plane/utils";
//local
import { storage } from "@/lib/local-storage";
import type { IBaseIssuesStore } from "../helpers/base-issues.store";
import { BaseIssuesStore } from "../helpers/base-issues.store";
//
import type { IIssueRootStore } from "../root.store";
import type { ISprintIssuesFilter } from "./filter.store";

export const ACTIVE_SPRINT_ISSUES = "ACTIVE_SPRINT_ISSUES";

export interface ActiveSprintIssueDetails {
  issueIds: string[];
  issueCount: number;
  nextCursor: string;
  nextPageResults: boolean;
  perPageCount: number;
}

export interface ISprintIssues extends IBaseIssuesStore {
  viewFlags: ViewFlags;
  activeSprintIds: Record<string, ActiveSprintIssueDetails>;
  //action helpers
  getActiveSprintById: (sprintId: string) => ActiveSprintIssueDetails | undefined;
  // actions
  getIssueIds: (groupId?: string, subGroupId?: string) => string[] | undefined;
  fetchIssues: (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    options: IssuePaginationOptions,
    sprintId: string
  ) => Promise<TIssuesResponse | undefined>;
  fetchIssuesWithExistingPagination: (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    sprintId: string
  ) => Promise<TIssuesResponse | undefined>;
  fetchNextIssues: (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    groupId?: string,
    subGroupId?: string
  ) => Promise<TIssuesResponse | undefined>;

  fetchActiveSprintIssues: (
    workspaceSlug: string,
    projectId: string,
    perPageCount: number,
    sprintId: string
  ) => Promise<TIssuesResponse | undefined>;
  fetchNextActiveSprintIssues: (
    workspaceSlug: string,
    projectId: string,
    sprintId: string
  ) => Promise<TIssuesResponse | undefined>;

  createIssue: (workspaceSlug: string, projectId: string, data: Partial<TIssue>, sprintId: string) => Promise<TIssue>;
  updateIssue: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => Promise<void>;
  archiveIssue: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  quickAddIssue: (
    workspaceSlug: string,
    projectId: string,
    data: TIssue,
    sprintId: string
  ) => Promise<TIssue | undefined>;
  removeBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  archiveBulkIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<void>;
  bulkUpdateProperties: (workspaceSlug: string, projectId: string, data: TBulkOperationsPayload) => Promise<void>;

  transferIssuesFromSprint: (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    payload: {
      new_sprint_id: string;
    }
  ) => Promise<TIssue>;
}

export class SprintIssues extends BaseIssuesStore implements ISprintIssues {
  activeSprintIds: Record<string, ActiveSprintIssueDetails> = {};
  viewFlags = {
    enableQuickAdd: true,
    enableIssueCreation: true,
    enableInlineEditing: true,
  };
  // filter store
  issueFilterStore;

  constructor(_rootStore: IIssueRootStore, issueFilterStore: ISprintIssuesFilter) {
    super(_rootStore, issueFilterStore);
    makeObservable(this, {
      // observable
      activeSprintIds: observable,
      // action
      fetchIssues: action,
      fetchNextIssues: action,
      fetchIssuesWithExistingPagination: action,

      transferIssuesFromSprint: action,
      fetchActiveSprintIssues: action,

      quickAddIssue: action,
    });
    // filter store
    this.issueFilterStore = issueFilterStore;
  }

  getActiveSprintById = computedFn((sprintId: string) => this.activeSprintIds[sprintId]);

  /**
   * Fetches the sprint details
   * @param workspaceSlug
   * @param projectId
   * @param id is the sprint Id
   */
  fetchParentStats = (workspaceSlug: string, projectId?: string, id?: string) => {
    const sprintId = id ?? this.sprintId;

    if (projectId && sprintId) {
      this.rootIssueStore.rootStore.sprint.fetchSprintDetails(workspaceSlug, projectId, sprintId);
    }
    // fetch sprint progress
    const isSidebarCollapsed = storage.get("sprint_sidebar_collapsed");
    if (
      projectId &&
      sprintId &&
      this.rootIssueStore.rootStore.sprint.getSprintById(sprintId)?.version === 2 &&
      isSidebarCollapsed &&
      JSON.parse(isSidebarCollapsed) === false
    ) {
      this.rootIssueStore.rootStore.sprint.fetchActiveSprintProgressPro(workspaceSlug, projectId, sprintId);
    }
  };

  updateParentStats = (prevIssueState?: TIssue, nextIssueState?: TIssue, id?: string) => {
    try {
      const distributionUpdates = getDistributionPathsPostUpdate(
        prevIssueState,
        nextIssueState,
        this.rootIssueStore.rootStore.state.stateMap,
        this.rootIssueStore.rootStore.projectEstimate?.currentActiveEstimate?.estimatePointById
      );

      const sprintId = id ?? this.sprintId;
      if (sprintId) {
        this.rootIssueStore.rootStore.sprint.updateSprintDistribution(distributionUpdates, sprintId);
      }
    } catch (_e) {
      console.warn("could not update sprint statistics");
    }
  };

  /**
   * This method is called to fetch the first issues of pagination
   * @param workspaceSlug
   * @param projectId
   * @param loadType
   * @param options
   * @param sprintId
   * @returns
   */
  fetchIssues = async (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    options: IssuePaginationOptions,
    sprintId: string,
    isExistingPaginationOptions: boolean = false
  ) => {
    try {
      // set loader and clear store
      runInAction(() => {
        this.setLoader(loadType);
        this.clear(!isExistingPaginationOptions); // clear while fetching from server.
      });

      // get params from pagination options
      const params = this.issueFilterStore?.getFilterParams(options, sprintId, undefined, undefined, undefined);
      // call the fetch issues API with the params
      const response = await this.issueService.getIssues(workspaceSlug, projectId, params, {
        signal: this.controller.signal,
      });

      // after fetching issues, call the base method to process the response further
      this.onfetchIssues(response, options, workspaceSlug, projectId, sprintId, !isExistingPaginationOptions);
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
   * @param sprintId
   * @param groupId
   * @param subGroupId
   * @returns
   */
  fetchNextIssues = async (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
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
        sprintId,
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
   * @param sprintId
   * @returns
   */
  fetchIssuesWithExistingPagination = async (
    workspaceSlug: string,
    projectId: string,
    loadType: TLoader,
    sprintId: string
  ) => {
    if (!this.paginationOptions) return;
    return await this.fetchIssues(workspaceSlug, projectId, loadType, this.paginationOptions, sprintId, true);
  };

  /**
   * Override inherited create issue, to also add issue to sprint
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @param sprintId
   * @returns
   */
  override createIssue = async (workspaceSlug: string, projectId: string, data: Partial<TIssue>, sprintId: string) => {
    const response = await super.createIssue(workspaceSlug, projectId, data, sprintId, false);
    await this.addIssueToSprint(workspaceSlug, projectId, sprintId, [response.id], false);
    return response;
  };

  /**
   * This method is used to transfer issues from completed sprints to a new sprint
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @param payload contains new sprint Id
   * @returns
   */
  transferIssuesFromSprint = async (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    payload: {
      new_sprint_id: string;
    }
  ) => {
    // call API call to transfer issues
    const response = await this.sprintService.transferIssues(workspaceSlug, projectId, sprintId, payload);
    // call fetch issues
    if (this.paginationOptions) {
      await this.fetchIssues(workspaceSlug, projectId, "mutation", this.paginationOptions, sprintId);
    }

    return response;
  };

  /**
   * This is Pagination for active sprint issues
   * This method is called to fetch the first page of issues pagination
   * @param workspaceSlug
   * @param projectId
   * @param perPageCount
   * @param sprintId
   * @returns
   */
  fetchActiveSprintIssues = async (workspaceSlug: string, projectId: string, perPageCount: number, sprintId: string) => {
    // set loader
    set(this.activeSprintIds, [sprintId], undefined);

    // set params for urgent and high
    const params = { priority: `urgent,high`, cursor: `${perPageCount}:0:0`, per_page: perPageCount };
    // call the fetch issues API
    const response = await this.sprintService.getSprintIssues(workspaceSlug, projectId, sprintId, params);

    // Process issue response
    const { issueList, groupedIssues } = this.processIssueResponse(response);

    // add issues to the main Issue Map
    this.rootIssueStore.issues.addIssue(issueList);
    const activeIssueIds = groupedIssues[ALL_ISSUES] as string[];

    // store the processed data in the current store
    set(this.activeSprintIds, [sprintId], {
      issueIds: activeIssueIds,
      issueCount: response.total_count,
      nextCursor: response.next_cursor,
      nextPageResults: response.next_page_results,
      perPageCount: perPageCount,
    });

    return response;
  };

  /**
   * This is Pagination for active sprint issues
   * This method is called subsequent pages of pagination
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @returns
   */
  fetchNextActiveSprintIssues = async (workspaceSlug: string, projectId: string, sprintId: string) => {
    //get the previous pagination data for the sprint id
    const activeSprint = get(this.activeSprintIds, [sprintId]);

    // if there is no active sprint and the next pages does not exist return
    if (!activeSprint || !activeSprint.nextPageResults) return;

    // create params
    const params = { priority: `urgent,high`, cursor: activeSprint.nextCursor, per_page: activeSprint.perPageCount };
    // fetch API response
    const response = await this.sprintService.getSprintIssues(workspaceSlug, projectId, sprintId, params);

    // Process the response
    const { issueList, groupedIssues } = this.processIssueResponse(response);

    // add issues to main issue Map
    this.rootIssueStore.issues.addIssue(issueList);

    const activeIssueIds = groupedIssues[ALL_ISSUES] as string[];

    // store the processed data for subsequent pages
    set(this.activeSprintIds, [sprintId, "issueCount"], response.total_count);
    set(this.activeSprintIds, [sprintId, "nextCursor"], response.next_cursor);
    set(this.activeSprintIds, [sprintId, "nextPageResults"], response.next_page_results);
    set(this.activeSprintIds, [sprintId, "issueCount"], response.total_count);
    update(this.activeSprintIds, [sprintId, "issueIds"], (issueIds: string[] = []) =>
      this.issuesSortWithOrderBy(uniq(concat(issueIds, activeIssueIds)), this.orderBy)
    );

    return response;
  };

  /**
   * This Method overrides the base quickAdd issue
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @param sprintId
   * @returns
   */
  quickAddIssue = async (workspaceSlug: string, projectId: string, data: TIssue, sprintId: string) => {
    // add temporary issue to store list
    this.addIssue(data);

    // call overridden create issue
    const response = await this.createIssue(workspaceSlug, projectId, data, sprintId);

    // remove temp Issue from store list
    runInAction(() => {
      this.removeIssueFromList(data.id);
      this.rootIssueStore.issues.removeIssue(data.id);
    });

    const currentEpicIds =
      data.epic_ids && data.epic_ids.length > 0 ? data.epic_ids.filter((epicId) => epicId != "None") : [];

    if (currentEpicIds.length > 0) {
      await this.changeEpicsInIssue(workspaceSlug, projectId, response.id, currentEpicIds, []);
    }

    return response;
  };

  // Using aliased names as they cannot be overridden in other stores
  archiveBulkIssues = this.bulkArchiveIssues;
  updateIssue = this.issueUpdate;
  archiveIssue = this.issueArchive;
}

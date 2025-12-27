import { create } from "zustand";
import { uniq, isEmpty, omit } from "lodash-es";
import type { EPastDurationFilters } from "@plane/constants";
import type {
  TInboxIssue,
  TInboxIssueCurrentTab,
  TInboxIssueFilter,
  TInboxIssueSorting,
  TInboxIssuePaginationInfo,
  TInboxIssueSortingOrderByQueryParam,
} from "@plane/types";
import { EInboxIssueCurrentTab, EInboxIssueStatus } from "@plane/types";
import { getCustomDates } from "@plane/utils";
import { InboxIssueService } from "@/services/inbox";
import { IssueActivityService } from "@/services/issue";
import type { IInboxIssueStore } from "@/store/inbox/inbox-issue.store";
import { InboxIssueStore } from "@/store/inbox/inbox-issue.store";
import { getRouterWorkspaceSlug } from "@/store/client";
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
import { useIssueAttachmentStore } from "@/store/issue/issue-details/attachment.store";
import { useIssueCommentStore } from "@/store/issue/issue-details/comment.store";
import { useIssueReactionStore } from "@/store/issue/issue-details/reaction.store";
import type { CoreRootStore } from "@/store/root.store";

type TLoader =
  | "init-loading"
  | "mutation-loading"
  | "filter-loading"
  | "pagination-loading"
  | "issue-loading"
  | undefined;

/**
 * Project Inbox state managed by Zustand.
 */
interface ProjectInboxStoreState {
  currentTab: TInboxIssueCurrentTab;
  loader: TLoader;
  error: { message: string; status: "init-error" | "pagination-error" } | undefined;
  currentInboxProjectId: string;
  filtersMap: Record<string, Partial<TInboxIssueFilter>>;
  sortingMap: Record<string, Partial<TInboxIssueSorting>>;
  inboxIssuePaginationInfo: TInboxIssuePaginationInfo | undefined;
  inboxIssues: Record<string, IInboxIssueStore>;
  inboxIssueIds: string[];
}

interface ProjectInboxStoreActions {
  // Setters
  setCurrentTab: (tab: TInboxIssueCurrentTab) => void;
  setLoader: (loader: TLoader) => void;
  setError: (error: { message: string; status: "init-error" | "pagination-error" } | undefined) => void;
  setCurrentInboxProjectId: (projectId: string) => void;
  setFilters: (projectId: string, filters: Partial<TInboxIssueFilter>) => void;
  setSorting: (projectId: string, sorting: Partial<TInboxIssueSorting>) => void;
  setInboxIssuePaginationInfo: (info: TInboxIssuePaginationInfo | undefined) => void;
  setInboxIssues: (issues: Record<string, IInboxIssueStore>) => void;
  setInboxIssueIds: (ids: string[]) => void;
  updateInboxIssue: (issueId: string, issue: IInboxIssueStore) => void;
  removeInboxIssue: (issueId: string) => void;
  appendInboxIssueIds: (ids: string[]) => void;

  // Getters
  getIssueInboxByIssueId: (issueId: string) => IInboxIssueStore | undefined;
  getIsIssueAvailable: (inboxIssueId: string) => boolean;
  getInboxFilters: (projectId: string) => Partial<TInboxIssueFilter>;
  getInboxSorting: (projectId: string) => Partial<TInboxIssueSorting>;
  getAppliedFiltersCount: (projectId: string) => number;
  getFilteredInboxIssueIds: (
    tab: TInboxIssueCurrentTab,
    filters: Partial<TInboxIssueFilter>,
    issueIds: string[],
    issues: Record<string, IInboxIssueStore>
  ) => string[];

  // Helper actions
  inboxIssueQueryParams: (
    inboxFilters: Partial<TInboxIssueFilter>,
    inboxSorting: Partial<TInboxIssueSorting>,
    pagePerCount: number,
    paginationCursor: string
  ) => Partial<Record<keyof TInboxIssueFilter, string>>;
  createOrUpdateInboxIssue: (inboxIssues: TInboxIssue[], workspaceSlug: string, projectId: string, rootStore: CoreRootStore) => void;
  initializeDefaultFilters: (projectId: string, tab: TInboxIssueCurrentTab) => void;
}

export type ProjectInboxStore = ProjectInboxStoreState & ProjectInboxStoreActions;

const initialState: ProjectInboxStoreState = {
  currentTab: EInboxIssueCurrentTab.OPEN,
  loader: "init-loading",
  error: undefined,
  currentInboxProjectId: "",
  filtersMap: {},
  sortingMap: {},
  inboxIssuePaginationInfo: undefined,
  inboxIssues: {},
  inboxIssueIds: [],
};

/**
 * Project Inbox Store (Zustand)
 *
 * Manages inbox issues for projects.
 * Migrated from MobX ProjectInboxStore to Zustand.
 */
export const useProjectInboxStore = create<ProjectInboxStore>()((set, get) => ({
  ...initialState,

  // Constants
  PER_PAGE_COUNT: 10,

  // Setters
  setCurrentTab: (tab) => set({ currentTab: tab }),

  setLoader: (loader) => set({ loader }),

  setError: (error) => set({ error }),

  setCurrentInboxProjectId: (projectId) => set({ currentInboxProjectId: projectId }),

  setFilters: (projectId, filters) => {
    set((state) => ({
      filtersMap: { ...state.filtersMap, [projectId]: filters },
    }));
  },

  setSorting: (projectId, sorting) => {
    set((state) => ({
      sortingMap: { ...state.sortingMap, [projectId]: sorting },
    }));
  },

  setInboxIssuePaginationInfo: (info) => set({ inboxIssuePaginationInfo: info }),

  setInboxIssues: (issues) => set({ inboxIssues: issues }),

  setInboxIssueIds: (ids) => set({ inboxIssueIds: ids }),

  updateInboxIssue: (issueId, issue) => {
    set((state) => ({
      inboxIssues: { ...state.inboxIssues, [issueId]: issue },
    }));
  },

  removeInboxIssue: (issueId) => {
    set((state) => ({
      inboxIssues: omit(state.inboxIssues, issueId),
      inboxIssueIds: state.inboxIssueIds.filter((id) => id !== issueId),
    }));
  },

  appendInboxIssueIds: (ids) => {
    set((state) => ({
      inboxIssueIds: uniq([...state.inboxIssueIds, ...ids]),
    }));
  },

  // Getters
  getIssueInboxByIssueId: (issueId) => get().inboxIssues?.[issueId],

  getIsIssueAvailable: (inboxIssueId) => {
    const { inboxIssueIds } = get();
    if (!inboxIssueIds) return true;
    return inboxIssueIds.includes(inboxIssueId);
  },

  getInboxFilters: (projectId) => {
    const { filtersMap } = get();
    if (!projectId) return {} as TInboxIssueFilter;
    return filtersMap?.[projectId] || {};
  },

  getInboxSorting: (projectId) => {
    const { sortingMap } = get();
    if (!projectId) return {} as TInboxIssueSorting;
    return sortingMap?.[projectId] || {};
  },

  getAppliedFiltersCount: (projectId) => {
    const filters = get().getInboxFilters(projectId);
    let count = 0;
    if (filters) {
      Object.keys(filters).forEach((key) => {
        const filterKey = key as keyof TInboxIssueFilter;
        if (filters[filterKey] && filters?.[filterKey])
          count = count + (filters?.[filterKey]?.length ?? 0);
      });
    }
    return count;
  },

  getFilteredInboxIssueIds: (tab, filters, issueIds, issues) => {
    let appliedFilters =
      tab === EInboxIssueCurrentTab.OPEN
        ? [EInboxIssueStatus.PENDING, EInboxIssueStatus.SNOOZED]
        : [EInboxIssueStatus.ACCEPTED, EInboxIssueStatus.DECLINED, EInboxIssueStatus.DUPLICATE];
    appliedFilters = appliedFilters.filter((filter) => filters?.status?.includes(filter));
    const currentTime = new Date().getTime();

    return tab === EInboxIssueCurrentTab.OPEN
      ? issueIds.filter((id) => {
          if (appliedFilters.length == 2) return true;
          if (appliedFilters[0] === EInboxIssueStatus.SNOOZED)
            return (
              issues[id].status === EInboxIssueStatus.SNOOZED &&
              currentTime < new Date(issues[id].snoozed_till!).getTime()
            );
          if (appliedFilters[0] === EInboxIssueStatus.PENDING)
            return (
              appliedFilters.includes(issues[id].status) ||
              (issues[id].status === EInboxIssueStatus.SNOOZED &&
                currentTime > new Date(issues[id].snoozed_till!).getTime())
            );
        })
      : issueIds.filter((id) => appliedFilters.includes(issues[id].status));
  },

  // Helper methods
  inboxIssueQueryParams: (inboxFilters, inboxSorting, pagePerCount, paginationCursor) => {
    const filters: Partial<Record<keyof TInboxIssueFilter, string>> = {};
    !isEmpty(inboxFilters) &&
      Object.keys(inboxFilters).forEach((key) => {
        const filterKey = key as keyof TInboxIssueFilter;
        if (inboxFilters[filterKey] && inboxFilters[filterKey]?.length) {
          if (["created_at", "updated_at"].includes(filterKey) && (inboxFilters[filterKey] || [])?.length > 0) {
            const appliedDateFilters: string[] = [];
            inboxFilters[filterKey]?.forEach((value) => {
              const dateValue = value as EPastDurationFilters;
              appliedDateFilters.push(getCustomDates(dateValue));
            });
            filters[filterKey] = appliedDateFilters?.join(",");
          } else filters[filterKey] = inboxFilters[filterKey]?.join(",");
        }
      });

    const sorting: TInboxIssueSortingOrderByQueryParam = {
      order_by: "-issue__created_at",
    };
    if (inboxSorting?.order_by && inboxSorting?.sort_by) {
      switch (inboxSorting.order_by) {
        case "issue__created_at":
          if (inboxSorting.sort_by === "desc") sorting.order_by = `-issue__created_at`;
          else sorting.order_by = "issue__created_at";
          break;
        case "issue__updated_at":
          if (inboxSorting.sort_by === "desc") sorting.order_by = `-issue__updated_at`;
          else sorting.order_by = "issue__updated_at";
          break;
        case "issue__sequence_id":
          if (inboxSorting.sort_by === "desc") sorting.order_by = `-issue__sequence_id`;
          else sorting.order_by = "issue__sequence_id";
          break;
        default:
          sorting.order_by = "-issue__created_at";
          break;
      }
    }

    return {
      ...filters,
      ...sorting,
      per_page: pagePerCount,
      cursor: paginationCursor,
    };
  },

  createOrUpdateInboxIssue: (inboxIssues, workspaceSlug, projectId, rootStore) => {
    if (inboxIssues && inboxIssues.length > 0) {
      const state = get();
      const updatedIssues = { ...state.inboxIssues };

      inboxIssues.forEach((inbox: TInboxIssue) => {
        const existingInboxIssueDetail = state.getIssueInboxByIssueId(inbox?.issue?.id);
        if (existingInboxIssueDetail) {
          Object.assign(existingInboxIssueDetail, {
            ...inbox,
            issue: {
              ...existingInboxIssueDetail.issue,
              ...inbox.issue,
            },
          });
        } else {
          updatedIssues[inbox?.issue?.id] = new InboxIssueStore(workspaceSlug, projectId, inbox, rootStore);
        }
      });

      set({ inboxIssues: updatedIssues });
    }
  },

  initializeDefaultFilters: (projectId, tab) => {
    if (!projectId || !tab) return;
    const state = get();
    const filters = state.getInboxFilters(projectId);
    const sorting = state.getInboxSorting(projectId);

    if (isEmpty(filters)) {
      state.setFilters(projectId, {
        status:
          tab === EInboxIssueCurrentTab.OPEN
            ? [EInboxIssueStatus.PENDING]
            : [EInboxIssueStatus.ACCEPTED, EInboxIssueStatus.DECLINED, EInboxIssueStatus.DUPLICATE],
      });
    }
    if (isEmpty(sorting)) {
      state.setSorting(projectId, { order_by: "issue__created_at", sort_by: "desc" });
    }
  },
}));

// Service instances
const inboxIssueService = new InboxIssueService();
const issueActivityService = new IssueActivityService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IProjectInboxStore {
  currentTab: TInboxIssueCurrentTab;
  loader: TLoader;
  error: { message: string; status: "init-error" | "pagination-error" } | undefined;
  currentInboxProjectId: string;
  filtersMap: Record<string, Partial<TInboxIssueFilter>>;
  sortingMap: Record<string, Partial<TInboxIssueSorting>>;
  inboxIssuePaginationInfo: TInboxIssuePaginationInfo | undefined;
  inboxIssues: Record<string, IInboxIssueStore>;
  inboxIssueIds: string[];
  // computed
  inboxFilters: Partial<TInboxIssueFilter>;
  inboxSorting: Partial<TInboxIssueSorting>;
  getAppliedFiltersCount: number;
  filteredInboxIssueIds: string[];
  // computed functions
  getIssueInboxByIssueId: (issueId: string) => IInboxIssueStore | undefined;
  getIsIssueAvailable: (inboxIssueId: string) => boolean;
  // helper actions
  inboxIssueQueryParams: (
    inboxFilters: Partial<TInboxIssueFilter>,
    inboxSorting: Partial<TInboxIssueSorting>,
    pagePerCount: number,
    paginationCursor: string
  ) => Partial<Record<keyof TInboxIssueFilter, string>>;
  createOrUpdateInboxIssue: (inboxIssues: TInboxIssue[], workspaceSlug: string, projectId: string) => void;
  initializeDefaultFilters: (projectId: string, tab: TInboxIssueCurrentTab) => void;
  // actions
  handleCurrentTab: (workspaceSlug: string, projectId: string, tab: TInboxIssueCurrentTab) => void;
  handleInboxIssueFilters: <T extends keyof TInboxIssueFilter>(key: T, value: TInboxIssueFilter[T]) => void;
  handleInboxIssueSorting: <T extends keyof TInboxIssueSorting>(key: T, value: TInboxIssueSorting[T]) => void;
  fetchInboxIssues: (
    workspaceSlug: string,
    projectId: string,
    loadingType?: TLoader,
    tab?: TInboxIssueCurrentTab
  ) => Promise<void>;
  fetchInboxPaginationIssues: (workspaceSlug: string, projectId: string) => Promise<void>;
  fetchInboxIssueById: (workspaceSlug: string, projectId: string, inboxIssueId: string) => Promise<TInboxIssue>;
  createInboxIssue: (
    workspaceSlug: string,
    projectId: string,
    data: Partial<TInboxIssue>
  ) => Promise<TInboxIssue | undefined>;
  deleteInboxIssue: (workspaceSlug: string, projectId: string, inboxIssueId: string) => Promise<void>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * @deprecated Use useProjectInboxStore hook directly in React components
 */
export class ProjectInboxStoreLegacy implements IProjectInboxStore {
  private rootStore: CoreRootStore;
  private PER_PAGE_COUNT = 10;

  constructor(rootStore: CoreRootStore) {
    this.rootStore = rootStore;
  }

  get currentTab() {
    return useProjectInboxStore.getState().currentTab;
  }

  get loader() {
    return useProjectInboxStore.getState().loader;
  }

  get error() {
    return useProjectInboxStore.getState().error;
  }

  get currentInboxProjectId() {
    return useProjectInboxStore.getState().currentInboxProjectId;
  }

  get filtersMap() {
    return useProjectInboxStore.getState().filtersMap;
  }

  get sortingMap() {
    return useProjectInboxStore.getState().sortingMap;
  }

  get inboxIssuePaginationInfo() {
    return useProjectInboxStore.getState().inboxIssuePaginationInfo;
  }

  get inboxIssues() {
    return useProjectInboxStore.getState().inboxIssues;
  }

  get inboxIssueIds() {
    return useProjectInboxStore.getState().inboxIssueIds;
  }

  // Computed properties
  get inboxFilters() {
    const projectId = this.currentInboxProjectId;
    return useProjectInboxStore.getState().getInboxFilters(projectId);
  }

  get inboxSorting() {
    const projectId = this.currentInboxProjectId;
    return useProjectInboxStore.getState().getInboxSorting(projectId);
  }

  get getAppliedFiltersCount() {
    const projectId = this.currentInboxProjectId;
    return useProjectInboxStore.getState().getAppliedFiltersCount(projectId);
  }

  get filteredInboxIssueIds() {
    const state = useProjectInboxStore.getState();
    return state.getFilteredInboxIssueIds(
      state.currentTab,
      this.inboxFilters,
      state.inboxIssueIds,
      state.inboxIssues
    );
  }

  getIssueInboxByIssueId = (issueId: string) => {
    return useProjectInboxStore.getState().getIssueInboxByIssueId(issueId);
  };

  getIsIssueAvailable = (inboxIssueId: string) => {
    return useProjectInboxStore.getState().getIsIssueAvailable(inboxIssueId);
  };

  inboxIssueQueryParams = (
    inboxFilters: Partial<TInboxIssueFilter>,
    inboxSorting: Partial<TInboxIssueSorting>,
    pagePerCount: number,
    paginationCursor: string
  ) => {
    return useProjectInboxStore.getState().inboxIssueQueryParams(
      inboxFilters,
      inboxSorting,
      pagePerCount,
      paginationCursor
    );
  };

  createOrUpdateInboxIssue = (inboxIssues: TInboxIssue[], workspaceSlug: string, projectId: string) => {
    useProjectInboxStore.getState().createOrUpdateInboxIssue(inboxIssues, workspaceSlug, projectId, this.rootStore);
  };

  initializeDefaultFilters = (projectId: string, tab: TInboxIssueCurrentTab) => {
    useProjectInboxStore.getState().initializeDefaultFilters(projectId, tab);
  };

  handleCurrentTab = (workspaceSlug: string, projectId: string, tab: TInboxIssueCurrentTab) => {
    if (workspaceSlug && projectId) {
      const state = useProjectInboxStore.getState();
      state.setCurrentTab(tab);
      state.setInboxIssueIds([]);
      state.setInboxIssuePaginationInfo(undefined);
      state.setSorting(projectId, { order_by: "issue__created_at", sort_by: "desc" });
      state.setFilters(projectId, {
        status:
          tab === EInboxIssueCurrentTab.OPEN
            ? [EInboxIssueStatus.PENDING]
            : [EInboxIssueStatus.ACCEPTED, EInboxIssueStatus.DECLINED, EInboxIssueStatus.DUPLICATE],
      });
      this.fetchInboxIssues(workspaceSlug, projectId, "filter-loading");
    }
  };

  handleInboxIssueFilters = <T extends keyof TInboxIssueFilter>(key: T, value: TInboxIssueFilter[T]) => {
    const workspaceSlug = getRouterWorkspaceSlug();
    const projectId = this.currentInboxProjectId;
    if (workspaceSlug && projectId) {
      const state = useProjectInboxStore.getState();
      const currentFilters = state.getInboxFilters(projectId);
      state.setFilters(projectId, { ...currentFilters, [key]: value });
      state.setInboxIssuePaginationInfo(undefined);
      this.fetchInboxIssues(workspaceSlug, projectId, "filter-loading");
    }
  };

  handleInboxIssueSorting = <T extends keyof TInboxIssueSorting>(key: T, value: TInboxIssueSorting[T]) => {
    const workspaceSlug = getRouterWorkspaceSlug();
    const projectId = this.currentInboxProjectId;
    if (workspaceSlug && projectId) {
      const state = useProjectInboxStore.getState();
      const currentSorting = state.getInboxSorting(projectId);
      state.setSorting(projectId, { ...currentSorting, [key]: value });
      state.setInboxIssuePaginationInfo(undefined);
      this.fetchInboxIssues(workspaceSlug, projectId, "filter-loading");
    }
  };

  fetchInboxIssues = async (
    workspaceSlug: string,
    projectId: string,
    loadingType: TLoader = undefined,
    tab: TInboxIssueCurrentTab | undefined = undefined
  ) => {
    try {
      if (loadingType === undefined && tab) this.initializeDefaultFilters(projectId, tab);

      const state = useProjectInboxStore.getState();

      if (state.currentInboxProjectId != projectId) {
        state.setCurrentInboxProjectId(projectId);
        state.setInboxIssues({});
        state.setInboxIssueIds([]);
        state.setInboxIssuePaginationInfo(undefined);
      }

      if (Object.keys(state.inboxIssueIds).length === 0) state.setLoader("init-loading");
      else state.setLoader("mutation-loading");
      if (loadingType) state.setLoader(loadingType);

      const filters = state.getInboxFilters(projectId);
      const sorting = state.getInboxSorting(projectId);
      const status = filters?.status;
      const queryParams = this.inboxIssueQueryParams(
        { ...filters, status },
        sorting,
        this.PER_PAGE_COUNT,
        `${this.PER_PAGE_COUNT}:0:0`
      );

      const { results, ...paginationInfo } = await inboxIssueService.list(workspaceSlug, projectId, queryParams);

      state.setLoader(undefined);
      state.setInboxIssuePaginationInfo(paginationInfo);
      if (results) {
        const issueIds = results.map((value) => value?.issue?.id);
        state.setInboxIssueIds(issueIds);
        this.createOrUpdateInboxIssue(results, workspaceSlug, projectId);
      }
    } catch (error) {
      console.error("Error fetching the intake issues", error);
      useProjectInboxStore.getState().setLoader(undefined);
      useProjectInboxStore.getState().setError({
        message: "Error fetching the intake work items please try again later.",
        status: "init-error",
      });
      throw error;
    }
  };

  fetchInboxPaginationIssues = async (workspaceSlug: string, projectId: string) => {
    try {
      const state = useProjectInboxStore.getState();
      const paginationInfo = state.inboxIssuePaginationInfo;

      if (
        paginationInfo &&
        (!paginationInfo?.total_results ||
          (paginationInfo?.total_results &&
            state.inboxIssueIds.length < paginationInfo?.total_results))
      ) {
        const filters = state.getInboxFilters(projectId);
        const sorting = state.getInboxSorting(projectId);
        const queryParams = this.inboxIssueQueryParams(
          filters,
          sorting,
          this.PER_PAGE_COUNT,
          paginationInfo?.next_cursor || `${this.PER_PAGE_COUNT}:0:0`
        );
        const { results, ...newPaginationInfo } = await inboxIssueService.list(workspaceSlug, projectId, queryParams);

        state.setInboxIssuePaginationInfo(newPaginationInfo);
        if (results && results.length > 0) {
          const issueIds = results.map((value) => value?.issue?.id);
          state.appendInboxIssueIds(issueIds);
          this.createOrUpdateInboxIssue(results, workspaceSlug, projectId);
        }
      } else {
        state.setInboxIssuePaginationInfo({
          ...paginationInfo,
          next_page_results: false,
        } as TInboxIssuePaginationInfo);
      }
    } catch (error) {
      console.error("Error fetching the intake issues", error);
      useProjectInboxStore.getState().setError({
        message: "Error fetching the paginated intake work items please try again later.",
        status: "pagination-error",
      });
      throw error;
    }
  };

  fetchInboxIssueById = async (
    workspaceSlug: string,
    projectId: string,
    inboxIssueId: string
  ): Promise<TInboxIssue> => {
    try {
      const state = useProjectInboxStore.getState();
      state.setLoader("issue-loading");
      const inboxIssue = await inboxIssueService.retrieve(workspaceSlug, projectId, inboxIssueId);
      const issueId = inboxIssue?.issue?.id || undefined;

      if (inboxIssue && issueId) {
        this.createOrUpdateInboxIssue([inboxIssue], workspaceSlug, projectId);
        state.setLoader(undefined);
        await Promise.all([
          // fetching reactions - use Zustand store directly
          useIssueReactionStore.getState().fetchReactions(workspaceSlug, projectId, issueId),
          // fetching activity - call service and update Zustand store
          (async () => {
            const activities = await issueActivityService.getIssueActivities(workspaceSlug, projectId, issueId, {});
            const activityIds = activities.map((a) => a.id);
            useIssueActivityStore.getState().updateActivities(issueId, activityIds);
            useIssueActivityStore.getState().updateActivityMap(activities);
          })(),
          // fetching comments - use Zustand store directly
          useIssueCommentStore.getState().fetchComments(workspaceSlug, projectId, issueId),
          // fetching attachments - use Zustand store directly
          useIssueAttachmentStore.getState().fetchAttachments(workspaceSlug, projectId, issueId),
        ]);
      }
      return inboxIssue;
    } catch (error) {
      console.error("Error fetching the intake issue with intake issue id");
      useProjectInboxStore.getState().setLoader(undefined);
      throw error;
    }
  };

  createInboxIssue = async (workspaceSlug: string, projectId: string, data: Partial<TInboxIssue>) => {
    try {
      const inboxIssueResponse = await inboxIssueService.create(workspaceSlug, projectId, data);
      if (inboxIssueResponse) {
        const state = useProjectInboxStore.getState();
        const newIssueId = inboxIssueResponse?.issue?.id;
        state.appendInboxIssueIds([newIssueId]);
        state.updateInboxIssue(
          newIssueId,
          new InboxIssueStore(workspaceSlug, projectId, inboxIssueResponse, this.rootStore)
        );
        const currentTotal = state.inboxIssuePaginationInfo?.total_results || 0;
        state.setInboxIssuePaginationInfo({
          ...state.inboxIssuePaginationInfo,
          total_results: currentTotal + 1,
        } as TInboxIssuePaginationInfo);
      }
      return inboxIssueResponse;
    } catch (error) {
      console.error("Error creating the intake issue");
      throw error;
    }
  };

  deleteInboxIssue = async (workspaceSlug: string, projectId: string, inboxIssueId: string) => {
    const state = useProjectInboxStore.getState();
    const currentIssue = state.inboxIssues?.[inboxIssueId];
    try {
      if (!currentIssue) return;
      await inboxIssueService.destroy(workspaceSlug, projectId, inboxIssueId).then(() => {
        const currentTotal = state.inboxIssuePaginationInfo?.total_results || 0;
        state.setInboxIssuePaginationInfo({
          ...state.inboxIssuePaginationInfo,
          total_results: currentTotal - 1,
        } as TInboxIssuePaginationInfo);
        state.removeInboxIssue(inboxIssueId);
      });
    } catch (error) {
      console.error("Error removing the intake issue");
      throw error;
    }
  };
}

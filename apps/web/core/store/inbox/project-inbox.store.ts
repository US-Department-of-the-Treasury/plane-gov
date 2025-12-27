import { uniq, isEmpty, omit, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { EPastDurationFilters } from "@plane/constants";
// types
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
// helpers
// services
import { InboxIssueService } from "@/services/inbox";
// root store
import type { IInboxIssueStore } from "@/store/inbox/inbox-issue.store";
import { InboxIssueStore } from "@/store/inbox/inbox-issue.store";
import { getRouterWorkspaceSlug, getRouterProjectId } from "@/store/client/router.store";
import type { CoreRootStore } from "../root.store";

type TLoader =
  | "init-loading"
  | "mutation-loading"
  | "filter-loading"
  | "pagination-loading"
  | "issue-loading"
  | undefined;

export interface IProjectInboxStore {
  currentTab: TInboxIssueCurrentTab;
  loader: TLoader;
  error: { message: string; status: "init-error" | "pagination-error" } | undefined;
  currentInboxProjectId: string;
  filtersMap: Record<string, Partial<TInboxIssueFilter>>; // projectId -> Partial<TInboxIssueFilter>
  sortingMap: Record<string, Partial<TInboxIssueSorting>>; // projectId -> Partial<TInboxIssueSorting>
  inboxIssuePaginationInfo: TInboxIssuePaginationInfo | undefined;
  inboxIssues: Record<string, IInboxIssueStore>; // issue_id -> IInboxIssueStore
  inboxIssueIds: string[];
  // computed
  inboxFilters: Partial<TInboxIssueFilter>; // computed project inbox filters
  inboxSorting: Partial<TInboxIssueSorting>; // computed project inbox sorting
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
  handleInboxIssueFilters: <T extends keyof TInboxIssueFilter>(key: T, value: TInboxIssueFilter[T]) => void; // if user sends me undefined, I will remove the value from the filter key
  handleInboxIssueSorting: <T extends keyof TInboxIssueSorting>(key: T, value: TInboxIssueSorting[T]) => void; // if user sends me undefined, I will remove the value from the filter key
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

// Zustand Store
interface ProjectInboxState {
  PER_PAGE_COUNT: number;
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

interface ProjectInboxActions {
  inboxIssueQueryParams: (
    inboxFilters: Partial<TInboxIssueFilter>,
    inboxSorting: Partial<TInboxIssueSorting>,
    pagePerCount: number,
    paginationCursor: string
  ) => Partial<Record<keyof TInboxIssueFilter, string>>;
  createOrUpdateInboxIssue: (inboxIssues: TInboxIssue[], workspaceSlug: string, projectId: string, store: CoreRootStore) => void;
  initializeDefaultFilters: (projectId: string, tab: TInboxIssueCurrentTab) => void;
  handleCurrentTab: (workspaceSlug: string, projectId: string, tab: TInboxIssueCurrentTab) => void;
  handleInboxIssueFilters: <T extends keyof TInboxIssueFilter>(key: T, value: TInboxIssueFilter[T], store: CoreRootStore) => void;
  handleInboxIssueSorting: <T extends keyof TInboxIssueSorting>(key: T, value: TInboxIssueSorting[T], store: CoreRootStore) => void;
  fetchInboxIssues: (
    workspaceSlug: string,
    projectId: string,
    loadingType?: TLoader,
    tab?: TInboxIssueCurrentTab
  ) => Promise<void>;
  fetchInboxPaginationIssues: (workspaceSlug: string, projectId: string) => Promise<TInboxIssue[] | undefined>;
  fetchInboxIssueById: (workspaceSlug: string, projectId: string, inboxIssueId: string, store: CoreRootStore) => Promise<TInboxIssue>;
  createInboxIssue: (
    workspaceSlug: string,
    projectId: string,
    data: Partial<TInboxIssue>,
    store: CoreRootStore
  ) => Promise<TInboxIssue | undefined>;
  deleteInboxIssue: (workspaceSlug: string, projectId: string, inboxIssueId: string) => Promise<void>;
}

type ProjectInboxStoreType = ProjectInboxState & ProjectInboxActions;

const inboxIssueService = new InboxIssueService();

export const useProjectInboxStore = create<ProjectInboxStoreType>()(
  immer((set, get) => ({
    // Constants
    PER_PAGE_COUNT: 10,

    // State
    currentTab: EInboxIssueCurrentTab.OPEN,
    loader: "init-loading" as TLoader,
    error: undefined,
    currentInboxProjectId: "",
    filtersMap: {},
    sortingMap: {},
    inboxIssuePaginationInfo: undefined,
    inboxIssues: {},
    inboxIssueIds: [],

      // Helper actions
      inboxIssueQueryParams: (
        inboxFilters: Partial<TInboxIssueFilter>,
        inboxSorting: Partial<TInboxIssueSorting>,
        pagePerCount: number,
        paginationCursor: string
      ) => {
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

      createOrUpdateInboxIssue: (inboxIssues: TInboxIssue[], workspaceSlug: string, projectId: string, store: CoreRootStore) => {
        if (inboxIssues && inboxIssues.length > 0) {
          set((draft) => {
            inboxIssues.forEach((inbox: TInboxIssue) => {
              const issueId = inbox?.issue?.id;
              if (!issueId) return;

              const existingInboxIssueDetail = draft.inboxIssues[issueId];
              if (existingInboxIssueDetail) {
                Object.assign(existingInboxIssueDetail, {
                  ...inbox,
                  issue: {
                    ...existingInboxIssueDetail.issue,
                    ...inbox.issue,
                  },
                });
              } else {
                draft.inboxIssues[issueId] = new InboxIssueStore(workspaceSlug, projectId, inbox, store);
              }
            });
          });
        }
      },

      initializeDefaultFilters: (projectId: string, tab: TInboxIssueCurrentTab) => {
        if (!projectId || !tab) return;
        const state = get();
        const currentFilters = state.filtersMap[projectId];
        const currentSorting = state.sortingMap[projectId];

        set((draft) => {
          if (isEmpty(currentFilters)) {
            draft.filtersMap[projectId] = {
              status:
                tab === EInboxIssueCurrentTab.OPEN
                  ? [EInboxIssueStatus.PENDING]
                  : [EInboxIssueStatus.ACCEPTED, EInboxIssueStatus.DECLINED, EInboxIssueStatus.DUPLICATE],
            };
          }
          if (isEmpty(currentSorting)) {
            draft.sortingMap[projectId] = { order_by: "issue__created_at", sort_by: "desc" };
          }
        });
      },

      // Actions
      handleCurrentTab: (workspaceSlug: string, projectId: string, tab: TInboxIssueCurrentTab) => {
        if (workspaceSlug && projectId) {
          set((draft) => {
            draft.currentTab = tab;
            draft.inboxIssueIds = [];
            draft.inboxIssuePaginationInfo = undefined;
            draft.sortingMap[projectId] = { order_by: "issue__created_at", sort_by: "desc" };
            draft.filtersMap[projectId] = {
              status:
                tab === EInboxIssueCurrentTab.OPEN
                  ? [EInboxIssueStatus.PENDING]
                  : [EInboxIssueStatus.ACCEPTED, EInboxIssueStatus.DECLINED, EInboxIssueStatus.DUPLICATE],
            };
          });
          get().fetchInboxIssues(workspaceSlug, projectId, "filter-loading");
        }
      },

      handleInboxIssueFilters: <T extends keyof TInboxIssueFilter>(key: T, value: TInboxIssueFilter[T], store: CoreRootStore) => {
        const workspaceSlug = getRouterWorkspaceSlug();
        const projectId = get().currentInboxProjectId;
        if (workspaceSlug && projectId) {
          set((draft) => {
            if (!draft.filtersMap[projectId]) {
              draft.filtersMap[projectId] = {};
            }
            // Use string path for proper Zustand reactivity
            lodashSet(draft.filtersMap, `${projectId}.${key}`, value);
            draft.inboxIssuePaginationInfo = undefined;
          });
          get().fetchInboxIssues(workspaceSlug, projectId, "filter-loading");
        }
      },

      handleInboxIssueSorting: <T extends keyof TInboxIssueSorting>(key: T, value: TInboxIssueSorting[T], store: CoreRootStore) => {
        const workspaceSlug = getRouterWorkspaceSlug();
        const projectId = get().currentInboxProjectId;
        if (workspaceSlug && projectId) {
          set((draft) => {
            if (!draft.sortingMap[projectId]) {
              draft.sortingMap[projectId] = {};
            }
            // Use string path for proper Zustand reactivity
            lodashSet(draft.sortingMap, `${projectId}.${key}`, value);
            draft.inboxIssuePaginationInfo = undefined;
          });
          get().fetchInboxIssues(workspaceSlug, projectId, "filter-loading");
        }
      },

      fetchInboxIssues: async (
        workspaceSlug: string,
        projectId: string,
        loadingType: TLoader = undefined,
        tab: TInboxIssueCurrentTab | undefined = undefined
      ) => {
        try {
          const state = get();
          if (loadingType === undefined && tab) get().initializeDefaultFilters(projectId, tab);

          if (state.currentInboxProjectId != projectId) {
            set((draft) => {
              draft.currentInboxProjectId = projectId;
              draft.inboxIssues = {};
              draft.inboxIssueIds = [];
              draft.inboxIssuePaginationInfo = undefined;
            });
          }

          const currentState = get();
          if (Object.keys(currentState.inboxIssueIds).length === 0) {
            set((draft) => { draft.loader = "init-loading"; });
          } else {
            set((draft) => { draft.loader = "mutation-loading"; });
          }
          if (loadingType) {
            set((draft) => { draft.loader = loadingType; });
          }

          const inboxFilters = currentState.filtersMap[projectId] || {};
          const inboxSorting = currentState.sortingMap[projectId] || {};
          const status = inboxFilters?.status;
          const queryParams = get().inboxIssueQueryParams(
            { ...inboxFilters, status },
            inboxSorting,
            currentState.PER_PAGE_COUNT,
            `${currentState.PER_PAGE_COUNT}:0:0`
          );
          const { results, ...paginationInfo } = await inboxIssueService.list(workspaceSlug, projectId, queryParams);

          set((draft) => {
            draft.loader = undefined;
            draft.inboxIssuePaginationInfo = paginationInfo;
            if (results) {
              const issueIds = results.map((value) => value?.issue?.id);
              draft.inboxIssueIds = issueIds;
            }
          });

          // Create or update inbox issues outside of set
          if (results) {
            // We need to get the store reference from the calling context
            // This will be handled in the legacy wrapper
          }
        } catch (error) {
          console.error("Error fetching the intake issues", error);
          set((draft) => {
            draft.loader = undefined;
            draft.error = {
              message: "Error fetching the intake work items please try again later.",
              status: "init-error",
            };
          });
          throw error;
        }
      },

      fetchInboxPaginationIssues: async (workspaceSlug: string, projectId: string) => {
        try {
          const state = get();
          if (
            state.inboxIssuePaginationInfo &&
            (!state.inboxIssuePaginationInfo?.total_results ||
              (state.inboxIssuePaginationInfo?.total_results &&
                state.inboxIssueIds.length < state.inboxIssuePaginationInfo?.total_results))
          ) {
            const inboxFilters = state.filtersMap[projectId] || {};
            const inboxSorting = state.sortingMap[projectId] || {};
            const queryParams = get().inboxIssueQueryParams(
              inboxFilters,
              inboxSorting,
              state.PER_PAGE_COUNT,
              state.inboxIssuePaginationInfo?.next_cursor || `${state.PER_PAGE_COUNT}:0:0`
            );
            const { results, ...paginationInfo } = await inboxIssueService.list(workspaceSlug, projectId, queryParams);

            set((draft) => {
              draft.inboxIssuePaginationInfo = paginationInfo;
              if (results && results.length > 0) {
                const issueIds = results.map((value) => value?.issue?.id);
                draft.inboxIssueIds = uniq([...draft.inboxIssueIds, ...issueIds]);
              }
            });

            // Create or update handled in legacy wrapper
            return results;
          } else {
            set((draft) => {
              if (draft.inboxIssuePaginationInfo) {
                draft.inboxIssuePaginationInfo.next_page_results = false;
              }
            });
          }
        } catch (error) {
          console.error("Error fetching the intake issues", error);
          set((draft) => {
            draft.error = {
              message: "Error fetching the paginated intake work items please try again later.",
              status: "pagination-error",
            };
          });
          throw error;
        }
      },

      fetchInboxIssueById: async (
        workspaceSlug: string,
        projectId: string,
        inboxIssueId: string,
        store: CoreRootStore
      ): Promise<TInboxIssue> => {
        try {
          set((draft) => { draft.loader = "issue-loading"; });
          const inboxIssue = await inboxIssueService.retrieve(workspaceSlug, projectId, inboxIssueId);
          const issueId = inboxIssue?.issue?.id || undefined;

          if (inboxIssue && issueId) {
            set((draft) => {
              draft.loader = undefined;
            });
            // Create or update handled in legacy wrapper
            await Promise.all([
              // fetching reactions
              store.issue.issueDetail.fetchReactions(workspaceSlug, projectId, issueId),
              // fetching activity
              store.issue.issueDetail.fetchActivities(workspaceSlug, projectId, issueId),
              // fetching comments
              store.issue.issueDetail.fetchComments(workspaceSlug, projectId, issueId),
              // fetching attachments
              store.issue.issueDetail.fetchAttachments(workspaceSlug, projectId, issueId),
            ]);
          }
          return inboxIssue;
        } catch (error) {
          console.error("Error fetching the intake issue with intake issue id");
          set((draft) => { draft.loader = undefined; });
          throw error;
        }
      },

      createInboxIssue: async (workspaceSlug: string, projectId: string, data: Partial<TInboxIssue>, store: CoreRootStore) => {
        try {
          const inboxIssueResponse = await inboxIssueService.create(workspaceSlug, projectId, data);
          if (inboxIssueResponse) {
            set((draft) => {
              const issueId = inboxIssueResponse?.issue?.id;
              if (issueId) {
                draft.inboxIssueIds = [...draft.inboxIssueIds, issueId];
                draft.inboxIssues[issueId] = new InboxIssueStore(workspaceSlug, projectId, inboxIssueResponse, store);
                if (draft.inboxIssuePaginationInfo) {
                  draft.inboxIssuePaginationInfo.total_results = (draft.inboxIssuePaginationInfo.total_results || 0) + 1;
                }
              }
            });
          }
          return inboxIssueResponse;
        } catch (error) {
          console.error("Error creating the intake issue");
          throw error;
        }
      },

      deleteInboxIssue: async (workspaceSlug: string, projectId: string, inboxIssueId: string) => {
        const currentIssue = get().inboxIssues?.[inboxIssueId];
        try {
          if (!currentIssue) return;
          await inboxIssueService.destroy(workspaceSlug, projectId, inboxIssueId).then(() => {
            set((draft) => {
              if (draft.inboxIssuePaginationInfo) {
                draft.inboxIssuePaginationInfo.total_results = (draft.inboxIssuePaginationInfo.total_results || 0) - 1;
              }
              draft.inboxIssues = omit(draft.inboxIssues, inboxIssueId);
              draft.inboxIssueIds = draft.inboxIssueIds.filter((id) => id !== inboxIssueId);
            });
          });
        } catch (error) {
          console.error("Error removing the intake issue");
          throw error;
        }
      },
    }))
);

// Legacy class wrapper for backward compatibility
export class ProjectInboxStore implements IProjectInboxStore {
  constructor(private store: CoreRootStore) {}

  private get state() {
    return useProjectInboxStore.getState();
  }

  get PER_PAGE_COUNT() {
    return this.state.PER_PAGE_COUNT;
  }

  get currentTab() {
    return this.state.currentTab;
  }

  get loader() {
    return this.state.loader;
  }

  get error() {
    return this.state.error;
  }

  get currentInboxProjectId() {
    return this.state.currentInboxProjectId;
  }

  get filtersMap() {
    return this.state.filtersMap;
  }

  get sortingMap() {
    return this.state.sortingMap;
  }

  get inboxIssuePaginationInfo() {
    return this.state.inboxIssuePaginationInfo;
  }

  get inboxIssues() {
    return this.state.inboxIssues;
  }

  get inboxIssueIds() {
    return this.state.inboxIssueIds;
  }

  // computed
  /**
   * @description computed project inbox filters
   */
  get inboxFilters() {
    if (!this.currentInboxProjectId) return {} as TInboxIssueFilter;
    return this.filtersMap?.[this.currentInboxProjectId] || {};
  }

  /**
   * @description computed project inbox sorting
   */
  get inboxSorting() {
    if (!this.currentInboxProjectId) return {} as TInboxIssueSorting;
    return this.sortingMap?.[this.currentInboxProjectId] || {};
  }

  get getAppliedFiltersCount() {
    let count = 0;
    this.inboxFilters != undefined &&
      Object.keys(this.inboxFilters).forEach((key) => {
        const filterKey = key as keyof TInboxIssueFilter;
        if (this.inboxFilters[filterKey] && this.inboxFilters?.[filterKey])
          count = count + (this.inboxFilters?.[filterKey]?.length ?? 0);
      });
    return count;
  }

  get filteredInboxIssueIds() {
    let appliedFilters =
      this.currentTab === EInboxIssueCurrentTab.OPEN
        ? [EInboxIssueStatus.PENDING, EInboxIssueStatus.SNOOZED]
        : [EInboxIssueStatus.ACCEPTED, EInboxIssueStatus.DECLINED, EInboxIssueStatus.DUPLICATE];
    appliedFilters = appliedFilters.filter((filter) => this.inboxFilters?.status?.includes(filter));
    const currentTime = new Date().getTime();

    return this.currentTab === EInboxIssueCurrentTab.OPEN
      ? this.inboxIssueIds.filter((id) => {
          if (appliedFilters.length == 2) return true;
          if (appliedFilters[0] === EInboxIssueStatus.SNOOZED)
            return (
              this.inboxIssues[id].status === EInboxIssueStatus.SNOOZED &&
              currentTime < new Date(this.inboxIssues[id].snoozed_till!).getTime()
            );
          if (appliedFilters[0] === EInboxIssueStatus.PENDING)
            return (
              appliedFilters.includes(this.inboxIssues[id].status) ||
              (this.inboxIssues[id].status === EInboxIssueStatus.SNOOZED &&
                currentTime > new Date(this.inboxIssues[id].snoozed_till!).getTime())
            );
        })
      : this.inboxIssueIds.filter((id) => appliedFilters.includes(this.inboxIssues[id].status));
  }

  getIssueInboxByIssueId = (issueId: string) => this.inboxIssues?.[issueId];

  getIsIssueAvailable = (inboxIssueId: string) => {
    if (!this.inboxIssueIds) return true;
    return this.inboxIssueIds.includes(inboxIssueId);
  };

  inboxIssueQueryParams = (
    inboxFilters: Partial<TInboxIssueFilter>,
    inboxSorting: Partial<TInboxIssueSorting>,
    pagePerCount: number,
    paginationCursor: string
  ) => this.state.inboxIssueQueryParams(inboxFilters, inboxSorting, pagePerCount, paginationCursor);

  createOrUpdateInboxIssue = (inboxIssues: TInboxIssue[], workspaceSlug: string, projectId: string) =>
    this.state.createOrUpdateInboxIssue(inboxIssues, workspaceSlug, projectId, this.store);

  initializeDefaultFilters = (projectId: string, tab: TInboxIssueCurrentTab) =>
    this.state.initializeDefaultFilters(projectId, tab);

  // actions
  handleCurrentTab = (workspaceSlug: string, projectId: string, tab: TInboxIssueCurrentTab) =>
    this.state.handleCurrentTab(workspaceSlug, projectId, tab);

  handleInboxIssueFilters = <T extends keyof TInboxIssueFilter>(key: T, value: TInboxIssueFilter[T]) =>
    this.state.handleInboxIssueFilters(key, value, this.store);

  handleInboxIssueSorting = <T extends keyof TInboxIssueSorting>(key: T, value: TInboxIssueSorting[T]) =>
    this.state.handleInboxIssueSorting(key, value, this.store);

  /**
   * @description fetch intake issues with paginated data
   * @param workspaceSlug
   * @param projectId
   */
  fetchInboxIssues = async (
    workspaceSlug: string,
    projectId: string,
    loadingType: TLoader = undefined,
    tab: TInboxIssueCurrentTab | undefined = undefined
  ) => {
    await this.state.fetchInboxIssues(workspaceSlug, projectId, loadingType, tab);
    // After fetch completes, update inbox issues with store reference
    const state = useProjectInboxStore.getState();
    const results = state.inboxIssueIds;
    if (results && results.length > 0) {
      this.state.createOrUpdateInboxIssue(
        results.map(id => ({ issue: { id } } as TInboxIssue)).filter(item => state.inboxIssues[item.issue.id]),
        workspaceSlug,
        projectId,
        this.store
      );
    }
  };

  /**
   * @description fetch intake issues with paginated data
   * @param workspaceSlug
   * @param projectId
   */
  fetchInboxPaginationIssues = async (workspaceSlug: string, projectId: string) => {
    const results = await this.state.fetchInboxPaginationIssues(workspaceSlug, projectId);
    // Update inbox issues after pagination
    if (results) {
      this.state.createOrUpdateInboxIssue(results, workspaceSlug, projectId, this.store);
    }
  };

  /**
   * @description fetch intake issue with issue id
   * @param workspaceSlug
   * @param projectId
   * @param inboxIssueId
   */
  fetchInboxIssueById = async (
    workspaceSlug: string,
    projectId: string,
    inboxIssueId: string
  ): Promise<TInboxIssue> => {
    const inboxIssue = await this.state.fetchInboxIssueById(workspaceSlug, projectId, inboxIssueId, this.store);
    // Update inbox issue after fetch
    if (inboxIssue) {
      this.state.createOrUpdateInboxIssue([inboxIssue], workspaceSlug, projectId, this.store);
    }
    return inboxIssue;
  };

  /**
   * @description create intake issue
   * @param workspaceSlug
   * @param projectId
   * @param data
   */
  createInboxIssue = (workspaceSlug: string, projectId: string, data: Partial<TInboxIssue>) =>
    this.state.createInboxIssue(workspaceSlug, projectId, data, this.store);

  /**
   * @description delete intake issue
   * @param workspaceSlug
   * @param projectId
   * @param inboxIssueId
   */
  deleteInboxIssue = (workspaceSlug: string, projectId: string, inboxIssueId: string) =>
    this.state.deleteInboxIssue(workspaceSlug, projectId, inboxIssueId);
}

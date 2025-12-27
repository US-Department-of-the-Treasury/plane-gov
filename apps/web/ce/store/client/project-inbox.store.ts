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
import type { IInboxIssueStore } from "@/store/inbox/inbox-issue.store";
import { InboxIssueStore } from "@/store/inbox/inbox-issue.store";
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

// Legacy class removed - use useProjectInboxStore hook directly

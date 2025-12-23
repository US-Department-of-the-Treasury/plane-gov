import { clone, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import type {
  TInboxIssue,
  TInboxIssueStatus,
  EInboxIssueSource,
  TIssue,
  TInboxDuplicateIssueDetails,
} from "@plane/types";
import { EInboxIssueStatus } from "@plane/types";
// services
import { InboxIssueService } from "@/services/inbox";
import { IssueService } from "@/services/issue";
// store
import type { CoreRootStore } from "../../core/store/root.store";

// Service instances at module level
const inboxIssueService = new InboxIssueService();
const issueService = new IssueService();

// State interface
export interface InboxIssueStoreState {
  isLoading: boolean;
  id: string;
  status: TInboxIssueStatus;
  issue: Partial<TIssue>;
  snoozed_till: Date | undefined;
  source: EInboxIssueSource | undefined;
  duplicate_to: string | undefined;
  created_by: string | undefined;
  duplicate_issue_detail: TInboxDuplicateIssueDetails | undefined;
  workspaceSlug: string;
  projectId: string;
  rootStore: CoreRootStore | null;
}

// Actions interface
export interface InboxIssueStoreActions {
  initialize: (
    workspaceSlug: string,
    projectId: string,
    data: TInboxIssue,
    rootStore: CoreRootStore
  ) => void;
  updateInboxIssueStatus: (status: TInboxIssueStatus) => Promise<void>;
  updateInboxIssueDuplicateTo: (issueId: string) => Promise<void>;
  updateInboxIssueSnoozeTill: (date: Date | undefined) => Promise<void>;
  updateIssue: (issue: Partial<TIssue>) => Promise<void>;
  updateProjectIssue: (issue: Partial<TIssue>) => Promise<void>;
  fetchIssueActivity: () => Promise<void>;
}

// Combined store type
export type InboxIssueStore = InboxIssueStoreState & InboxIssueStoreActions;

// Initial state
const initialState: InboxIssueStoreState = {
  isLoading: false,
  id: "",
  status: EInboxIssueStatus.PENDING,
  issue: {},
  snoozed_till: undefined,
  source: undefined,
  duplicate_to: undefined,
  created_by: undefined,
  duplicate_issue_detail: undefined,
  workspaceSlug: "",
  projectId: "",
  rootStore: null,
};

// Zustand store
export const useInboxIssueStore = create<InboxIssueStore>((set, get) => ({
  ...initialState,

  initialize: (workspaceSlug: string, projectId: string, data: TInboxIssue, rootStore: CoreRootStore) => {
    set({
      id: data.id,
      status: data.status,
      issue: data?.issue || {},
      snoozed_till: data?.snoozed_till || undefined,
      duplicate_to: data?.duplicate_to || undefined,
      created_by: data?.created_by || undefined,
      source: data?.source || undefined,
      duplicate_issue_detail: data?.duplicate_issue_detail || undefined,
      workspaceSlug,
      projectId,
      rootStore,
    });
  },

  updateInboxIssueStatus: async (status: TInboxIssueStatus) => {
    const state = get();
    const previousData: Partial<TInboxIssue> = {
      status: state.status,
    };

    try {
      if (!state.issue.id) return;

      const inboxIssue = await inboxIssueService.update(state.workspaceSlug, state.projectId, state.issue.id, {
        status: status,
      });

      set({ status: inboxIssue?.status });

      // If issue accepted sync issue to local db
      if (status === EInboxIssueStatus.ACCEPTED && state.rootStore) {
        const updatedIssue = { ...state.issue, ...inboxIssue.issue };
        state.rootStore.issue.issues.addIssue([updatedIssue]);
      }
    } catch {
      set({ status: previousData.status });
    }
  },

  updateInboxIssueDuplicateTo: async (issueId: string) => {
    const state = get();
    const inboxStatus = EInboxIssueStatus.DUPLICATE;
    const previousData: Partial<TInboxIssue> = {
      status: state.status,
      duplicate_to: state.duplicate_to,
      duplicate_issue_detail: state.duplicate_issue_detail,
    };

    try {
      if (!state.issue.id) return;

      const inboxIssue = await inboxIssueService.update(state.workspaceSlug, state.projectId, state.issue.id, {
        status: inboxStatus,
        duplicate_to: issueId,
      });

      set({
        status: inboxIssue?.status,
        duplicate_to: inboxIssue?.duplicate_to,
        duplicate_issue_detail: inboxIssue?.duplicate_issue_detail,
      });
    } catch {
      set({
        status: previousData.status,
        duplicate_to: previousData.duplicate_to,
        duplicate_issue_detail: previousData.duplicate_issue_detail,
      });
    }
  },

  updateInboxIssueSnoozeTill: async (date: Date | undefined) => {
    const state = get();
    const inboxStatus = date ? EInboxIssueStatus.SNOOZED : EInboxIssueStatus.PENDING;
    const previousData: Partial<TInboxIssue> = {
      status: state.status,
      snoozed_till: state.snoozed_till,
    };

    try {
      if (!state.issue.id) return;

      const inboxIssue = await inboxIssueService.update(state.workspaceSlug, state.projectId, state.issue.id, {
        status: inboxStatus,
        snoozed_till: date ? new Date(date) : null,
      });

      set({
        status: inboxIssue?.status,
        snoozed_till: inboxIssue?.snoozed_till,
      });
    } catch {
      set({
        status: previousData.status,
        snoozed_till: previousData.snoozed_till,
      });
    }
  },

  updateIssue: async (issue: Partial<TIssue>) => {
    const state = get();
    const inboxIssue = clone(state.issue);

    try {
      if (!state.issue.id) return;

      // Create updated issue object immutably
      const updatedIssue = { ...state.issue };
      Object.keys(issue).forEach((key) => {
        const issueKey = key as keyof TIssue;
        updatedIssue[issueKey] = issue[issueKey];
      });

      set({ issue: updatedIssue });

      await inboxIssueService.updateIssue(state.workspaceSlug, state.projectId, state.issue.id, issue);

      // Fetching activity
      get().fetchIssueActivity();
    } catch {
      set({ issue: inboxIssue });
    }
  },

  updateProjectIssue: async (issue: Partial<TIssue>) => {
    const state = get();
    const inboxIssue = clone(state.issue);

    try {
      if (!state.issue.id) return;

      // Create updated issue object immutably
      const updatedIssue = { ...state.issue };
      Object.keys(issue).forEach((key) => {
        const issueKey = key as keyof TIssue;
        updatedIssue[issueKey] = issue[issueKey];
      });

      set({ issue: updatedIssue });

      await issueService.patchIssue(state.workspaceSlug, state.projectId, state.issue.id, issue);

      if (issue.sprint_id && state.rootStore) {
        await state.rootStore.issue.issueDetail.addIssueToSprint(
          state.workspaceSlug,
          state.projectId,
          issue.sprint_id,
          [state.issue.id]
        );
      }

      if (issue.epic_ids && state.rootStore) {
        await state.rootStore.issue.issueDetail.changeEpicsInIssue(
          state.workspaceSlug,
          state.projectId,
          state.issue.id,
          issue.epic_ids,
          []
        );
      }

      // Fetching activity
      get().fetchIssueActivity();
    } catch {
      set({ issue: inboxIssue });
    }
  },

  fetchIssueActivity: async () => {
    const state = get();
    try {
      if (!state.issue.id || !state.rootStore) return;
      await state.rootStore.issue.issueDetail.fetchActivities(state.workspaceSlug, state.projectId, state.issue.id);
    } catch {
      console.error("Failed to fetch issue activity");
    }
  },
}));

// Legacy interface matching original MobX interface
export interface IInboxIssueStore {
  isLoading: boolean;
  id: string;
  status: TInboxIssueStatus;
  issue: Partial<TIssue>;
  snoozed_till: Date | undefined;
  source: EInboxIssueSource | undefined;
  duplicate_to: string | undefined;
  created_by: string | undefined;
  duplicate_issue_detail: TInboxDuplicateIssueDetails | undefined;
  // actions
  updateInboxIssueStatus: (status: TInboxIssueStatus) => Promise<void>;
  updateInboxIssueDuplicateTo: (issueId: string) => Promise<void>;
  updateInboxIssueSnoozeTill: (date: Date | undefined) => Promise<void>;
  updateIssue: (issue: Partial<TIssue>) => Promise<void>;
  updateProjectIssue: (issue: Partial<TIssue>) => Promise<void>;
  fetchIssueActivity: () => Promise<void>;
}

// Legacy class wrapper for backward compatibility
export class InboxIssueStoreLegacy implements IInboxIssueStore {
  private workspaceSlug: string;
  private projectId: string;
  private rootStore: CoreRootStore;

  constructor(workspaceSlug: string, projectId: string, data: TInboxIssue, store: CoreRootStore) {
    this.workspaceSlug = workspaceSlug;
    this.projectId = projectId;
    this.rootStore = store;

    // Initialize the Zustand store with the data
    useInboxIssueStore.getState().initialize(workspaceSlug, projectId, data, store);
  }

  // Getters that delegate to Zustand store
  get isLoading(): boolean {
    return useInboxIssueStore.getState().isLoading;
  }

  get id(): string {
    return useInboxIssueStore.getState().id;
  }

  get status(): TInboxIssueStatus {
    return useInboxIssueStore.getState().status;
  }

  get issue(): Partial<TIssue> {
    return useInboxIssueStore.getState().issue;
  }

  get snoozed_till(): Date | undefined {
    return useInboxIssueStore.getState().snoozed_till;
  }

  get source(): EInboxIssueSource | undefined {
    return useInboxIssueStore.getState().source;
  }

  get duplicate_to(): string | undefined {
    return useInboxIssueStore.getState().duplicate_to;
  }

  get created_by(): string | undefined {
    return useInboxIssueStore.getState().created_by;
  }

  get duplicate_issue_detail(): TInboxDuplicateIssueDetails | undefined {
    return useInboxIssueStore.getState().duplicate_issue_detail;
  }

  // Action methods that delegate to Zustand store
  updateInboxIssueStatus = async (status: TInboxIssueStatus): Promise<void> => {
    return useInboxIssueStore.getState().updateInboxIssueStatus(status);
  };

  updateInboxIssueDuplicateTo = async (issueId: string): Promise<void> => {
    return useInboxIssueStore.getState().updateInboxIssueDuplicateTo(issueId);
  };

  updateInboxIssueSnoozeTill = async (date: Date | undefined): Promise<void> => {
    return useInboxIssueStore.getState().updateInboxIssueSnoozeTill(date);
  };

  updateIssue = async (issue: Partial<TIssue>): Promise<void> => {
    return useInboxIssueStore.getState().updateIssue(issue);
  };

  updateProjectIssue = async (issue: Partial<TIssue>): Promise<void> => {
    return useInboxIssueStore.getState().updateProjectIssue(issue);
  };

  fetchIssueActivity = async (): Promise<void> => {
    return useInboxIssueStore.getState().fetchIssueActivity();
  };
}

// Export the legacy class as InboxIssueStore for backward compatibility
export { InboxIssueStoreLegacy as InboxIssueStore };

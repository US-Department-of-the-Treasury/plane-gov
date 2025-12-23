import { clone, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  TInboxIssue,
  TInboxIssueStatus,
  EInboxIssueSource,
  TIssue,
  TInboxDuplicateIssueDetails,
} from "@plane/types";
import { EInboxIssueStatus } from "@plane/types";
// helpers
// services
import { InboxIssueService } from "@/services/inbox";
import { IssueService } from "@/services/issue";
// store
import type { CoreRootStore } from "../root.store";

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
  updateInboxIssueStatus: (status: TInboxIssueStatus) => Promise<void>; // accept, decline
  updateInboxIssueDuplicateTo: (issueId: string) => Promise<void>; // connecting the inbox issue to the project existing issue
  updateInboxIssueSnoozeTill: (date: Date | undefined) => Promise<void>; // snooze the issue
  updateIssue: (issue: Partial<TIssue>) => Promise<void>; // updating the issue
  updateProjectIssue: (issue: Partial<TIssue>) => Promise<void>; // updating the issue
  fetchIssueActivity: () => Promise<void>; // fetching the issue activity
}

// Zustand Store
interface InboxIssueState {
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
}

interface InboxIssueActions {
  updateInboxIssueStatus: (status: TInboxIssueStatus, store: CoreRootStore) => Promise<void>;
  updateInboxIssueDuplicateTo: (issueId: string) => Promise<void>;
  updateInboxIssueSnoozeTill: (date: Date | undefined) => Promise<void>;
  updateIssue: (issue: Partial<TIssue>) => Promise<void>;
  updateProjectIssue: (issue: Partial<TIssue>, store: CoreRootStore) => Promise<void>;
  fetchIssueActivity: (store: CoreRootStore) => Promise<void>;
}

type InboxIssueStoreType = InboxIssueState & InboxIssueActions;

const createInboxIssueStore = (
  workspaceSlug: string,
  projectId: string,
  data: TInboxIssue
) => {
  const inboxIssueService = new InboxIssueService();
  const issueService = new IssueService();

  return create<InboxIssueStoreType>()(
    immer((set, get) => ({
      // State
      isLoading: false,
      id: data.id,
      status: data.status,
      issue: data?.issue || {},
      snoozed_till: data?.snoozed_till || undefined,
      source: data?.source || undefined,
      duplicate_to: data?.duplicate_to || undefined,
      created_by: data?.created_by || undefined,
      duplicate_issue_detail: data?.duplicate_issue_detail || undefined,
      workspaceSlug,
      projectId,

      // Actions
      updateInboxIssueStatus: async (status: TInboxIssueStatus, store: CoreRootStore) => {
        const state = get();
        const previousStatus = state.status;

        try {
          if (!state.issue.id) return;

          const inboxIssue = await inboxIssueService.update(state.workspaceSlug, state.projectId, state.issue.id, {
            status: status,
          });
          set((draft) => {
            draft.status = inboxIssue?.status;
          });

          // If issue accepted sync issue to local db
          if (status === EInboxIssueStatus.ACCEPTED) {
            const updatedIssue = { ...state.issue, ...inboxIssue.issue };
            store.issue.issues.addIssue([updatedIssue]);
          }
        } catch {
          set((draft) => {
            draft.status = previousStatus;
          });
        }
      },

      updateInboxIssueDuplicateTo: async (issueId: string) => {
        const state = get();
        const inboxStatus = EInboxIssueStatus.DUPLICATE as TInboxIssueStatus;
        const previousData = {
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
          set((draft) => {
            draft.status = inboxIssue?.status;
            draft.duplicate_to = inboxIssue?.duplicate_to;
            draft.duplicate_issue_detail = inboxIssue?.duplicate_issue_detail;
          });
        } catch {
          set((draft) => {
            draft.status = previousData.status;
            draft.duplicate_to = previousData.duplicate_to;
            draft.duplicate_issue_detail = previousData.duplicate_issue_detail;
          });
        }
      },

      updateInboxIssueSnoozeTill: async (date: Date | undefined) => {
        const state = get();
        const inboxStatus = (date ? EInboxIssueStatus.SNOOZED : EInboxIssueStatus.PENDING) as TInboxIssueStatus;
        const previousData = {
          status: state.status,
          snoozed_till: state.snoozed_till,
        };

        try {
          if (!state.issue.id) return;
          const inboxIssue = await inboxIssueService.update(state.workspaceSlug, state.projectId, state.issue.id, {
            status: inboxStatus,
            snoozed_till: date ? new Date(date) : null,
          });
          set((draft) => {
            draft.status = inboxIssue?.status;
            draft.snoozed_till = inboxIssue?.snoozed_till;
          });
        } catch {
          set((draft) => {
            draft.status = previousData.status;
            draft.snoozed_till = previousData.snoozed_till;
          });
        }
      },

      updateIssue: async (issue: Partial<TIssue>) => {
        const state = get();
        const inboxIssue = clone(state.issue);

        try {
          if (!state.issue.id) return;
          set((draft) => {
            Object.keys(issue).forEach((key) => {
              const issueKey = key as keyof TIssue;
              lodashSet(draft.issue, issueKey, issue[issueKey]);
            });
          });
          await inboxIssueService.updateIssue(state.workspaceSlug, state.projectId, state.issue.id, issue);
          // fetching activity - note: we need store reference
          // This is handled in the legacy wrapper
        } catch {
          set((draft) => {
            Object.keys(issue).forEach((key) => {
              const issueKey = key as keyof TIssue;
              lodashSet(draft.issue, issueKey, inboxIssue[issueKey]);
            });
          });
        }
      },

      updateProjectIssue: async (issue: Partial<TIssue>, store: CoreRootStore) => {
        const state = get();
        const inboxIssue = clone(state.issue);

        try {
          if (!state.issue.id) return;
          set((draft) => {
            Object.keys(issue).forEach((key) => {
              const issueKey = key as keyof TIssue;
              lodashSet(draft.issue, issueKey, issue[issueKey]);
            });
          });
          await issueService.patchIssue(state.workspaceSlug, state.projectId, state.issue.id, issue);
          if (issue.sprint_id) {
            await store.issue.issueDetail.addIssueToSprint(state.workspaceSlug, state.projectId, issue.sprint_id, [
              state.issue.id,
            ]);
          }
          if (issue.epic_ids) {
            await store.issue.issueDetail.changeEpicsInIssue(
              state.workspaceSlug,
              state.projectId,
              state.issue.id,
              issue.epic_ids,
              []
            );
          }

          // fetching activity
          await get().fetchIssueActivity(store);
        } catch {
          set((draft) => {
            Object.keys(issue).forEach((key) => {
              const issueKey = key as keyof TIssue;
              lodashSet(draft.issue, issueKey, inboxIssue[issueKey]);
            });
          });
        }
      },

      fetchIssueActivity: async (store: CoreRootStore) => {
        const state = get();
        try {
          if (!state.issue.id) return;
          await store.issue.issueDetail.fetchActivities(state.workspaceSlug, state.projectId, state.issue.id);
        } catch {
          console.error("Failed to fetch issue activity");
        }
      },
    }))
  );
};

// Legacy class wrapper for backward compatibility
export class InboxIssueStore implements IInboxIssueStore {
  private useStore: ReturnType<typeof createInboxIssueStore>;

  constructor(
    workspaceSlug: string,
    projectId: string,
    data: TInboxIssue,
    private store: CoreRootStore
  ) {
    this.useStore = createInboxIssueStore(workspaceSlug, projectId, data);
  }

  private get state() {
    return this.useStore.getState();
  }

  get isLoading() {
    return this.state.isLoading;
  }

  get id() {
    return this.state.id;
  }

  get status() {
    return this.state.status;
  }

  get issue() {
    return this.state.issue;
  }

  get snoozed_till() {
    return this.state.snoozed_till;
  }

  get source() {
    return this.state.source;
  }

  get duplicate_to() {
    return this.state.duplicate_to;
  }

  get created_by() {
    return this.state.created_by;
  }

  get duplicate_issue_detail() {
    return this.state.duplicate_issue_detail;
  }

  get workspaceSlug() {
    return this.state.workspaceSlug;
  }

  get projectId() {
    return this.state.projectId;
  }

  updateInboxIssueStatus = (status: TInboxIssueStatus) => this.state.updateInboxIssueStatus(status, this.store);

  updateInboxIssueDuplicateTo = (issueId: string) => this.state.updateInboxIssueDuplicateTo(issueId);

  updateInboxIssueSnoozeTill = (date: Date | undefined) => this.state.updateInboxIssueSnoozeTill(date);

  updateIssue = async (issue: Partial<TIssue>) => {
    await this.state.updateIssue(issue);
    await this.fetchIssueActivity();
  };

  updateProjectIssue = (issue: Partial<TIssue>) => this.state.updateProjectIssue(issue, this.store);

  fetchIssueActivity = () => this.state.fetchIssueActivity(this.store);
}

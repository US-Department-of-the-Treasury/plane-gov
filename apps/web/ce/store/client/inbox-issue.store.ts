/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import { clone } from "lodash-es";
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
import { EpicService } from "@/services/epic.service";
import { InboxIssueService } from "@/services/inbox";
import { IssueActivityService, IssueService } from "@/services/issue";
// store
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
import { useIssueStore } from "@/store/issue/issue.store";

// Service instances at module level
const inboxIssueService = new InboxIssueService();
const issueService = new IssueService();
const epicService = new EpicService();
const issueActivityService = new IssueActivityService();

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
}

// Actions interface
export interface InboxIssueStoreActions {
  initialize: (workspaceSlug: string, projectId: string, data: TInboxIssue) => void;
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
};

// Zustand store
export const useInboxIssueStore = create<InboxIssueStore>((set, get) => ({
  ...initialState,

  initialize: (workspaceSlug: string, projectId: string, data: TInboxIssue) => {
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

      // If issue accepted sync issue to local Zustand store
      if (status === EInboxIssueStatus.ACCEPTED) {
        const updatedIssue = { ...state.issue, ...inboxIssue.issue };
        useIssueStore.getState().addIssue([updatedIssue as TIssue]);
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
        snoozed_till: inboxIssue?.snoozed_till ?? undefined,
      });
    } catch {
      set({
        status: previousData.status,
        snoozed_till: previousData.snoozed_till ?? undefined,
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
        const value = issue[issueKey];
        // Only assign non-null and non-undefined values
        if (value !== null && value !== undefined) {
          (updatedIssue as any)[issueKey] = value;
        }
      });

      set({ issue: updatedIssue });

      await inboxIssueService.updateIssue(state.workspaceSlug, state.projectId, state.issue.id, issue);

      // Fetching activity
      void get().fetchIssueActivity();
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
        const value = issue[issueKey];
        // Only assign non-null and non-undefined values
        if (value !== null && value !== undefined) {
          (updatedIssue as any)[issueKey] = value;
        }
      });

      set({ issue: updatedIssue });

      await issueService.patchIssue(state.workspaceSlug, state.projectId, state.issue.id, issue);

      // Add issue to sprint if sprint_id is provided
      if (issue.sprint_id) {
        await issueService.addIssueToSprint(state.workspaceSlug, state.projectId, issue.sprint_id, {
          issues: [state.issue.id],
        });
      }

      // Add epics to issue if epic_ids are provided
      if (issue.epic_ids && issue.epic_ids.length > 0) {
        await epicService.addEpicsToIssue(state.workspaceSlug, state.projectId, state.issue.id, {
          epics: issue.epic_ids,
          removed_epics: [],
        });
      }

      // Fetching activity
      void get().fetchIssueActivity();
    } catch {
      set({ issue: inboxIssue });
    }
  },

  fetchIssueActivity: async () => {
    const state = get();
    try {
      if (!state.issue.id) return;

      // Get current activity IDs to determine if we should fetch only new activities
      const activityStore = useIssueActivityStore.getState();
      const currentActivityIds = activityStore.getActivitiesByIssueId(state.issue.id);

      let props: { created_at__gt?: string } = {};
      if (currentActivityIds && currentActivityIds.length > 0) {
        const currentActivity = activityStore.getActivityById(currentActivityIds[currentActivityIds.length - 1]);
        if (currentActivity) {
          props = { created_at__gt: currentActivity.created_at };
        }
      }

      // Fetch activities from service
      const activities = await issueActivityService.getIssueActivities(
        state.workspaceSlug,
        state.projectId,
        state.issue.id,
        props
      );

      // Update activity store with new activities
      const activityIds = activities.map((activity) => activity.id);
      activityStore.updateActivities(state.issue.id, activityIds);
      activityStore.updateActivityMap(activities);
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

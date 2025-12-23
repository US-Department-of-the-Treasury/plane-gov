import { set as lodashSet, update } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { TIssue } from "@plane/types";
// helpers
import { getCurrentDateTimeInISO } from "@plane/utils";
import { rootStore } from "@/lib/store-context";
// services
import { IssueService } from "@/services/issue";

export type IIssueStore = {
  // observables
  issuesMap: Record<string, TIssue>; // Record defines issue_id as key and TIssue as value
  issuesIdentifierMap: Record<string, string>; // Record defines issue_identifier as key and issue_id as value
  // actions
  getIssues(workspaceSlug: string, projectId: string, issueIds: string[]): Promise<TIssue[]>;
  addIssue(issues: TIssue[]): void;
  addIssueIdentifier(issueIdentifier: string, issueId: string): void;
  updateIssue(issueId: string, issue: Partial<TIssue>): void;
  removeIssue(issueId: string): void;
  // helper methods
  getIssueById(issueId: string): undefined | TIssue;
  getIssueIdByIdentifier(issueIdentifier: string): undefined | string;
  getIssuesByIds(issueIds: string[], type: "archived" | "un-archived"): TIssue[]; // Record defines issue_id as key and TIssue as value
};

// Zustand Store
interface IssueState {
  issuesMap: Record<string, TIssue>;
  issuesIdentifierMap: Record<string, string>;
}

interface IssueActions {
  getIssues: (workspaceSlug: string, projectId: string, issueIds: string[]) => Promise<TIssue[]>;
  addIssue: (issues: TIssue[]) => void;
  addIssueIdentifier: (issueIdentifier: string, issueId: string) => void;
  updateIssue: (issueId: string, issue: Partial<TIssue>) => void;
  removeIssue: (issueId: string) => void;
  getIssueById: (issueId: string) => TIssue | undefined;
  getIssueIdByIdentifier: (issueIdentifier: string) => string | undefined;
  getIssuesByIds: (issueIds: string[], type: "archived" | "un-archived") => TIssue[];
}

type IssueStoreType = IssueState & IssueActions & { issueService: IssueService };

export const useIssueStore = create<IssueStoreType>()(
  immer((set, get) => ({
    // State
    issuesMap: {},
    issuesIdentifierMap: {},
    issueService: new IssueService(),

    // Actions
    /**
     * @description This method will add issues to the issuesMap
     * @param {TIssue[]} issues
     * @returns {void}
     */
    addIssue: (issues: TIssue[]) => {
      if (issues && issues.length <= 0) return;
      set((state) => {
        issues.forEach((issue) => {
          // add issue identifier to the issuesIdentifierMap
          const projectIdentifier = rootStore.projectRoot.project.getProjectIdentifierById(issue?.project_id);
          const workItemSequenceId = issue?.sequence_id;
          const issueIdentifier = `${projectIdentifier}-${workItemSequenceId}`;
          state.issuesIdentifierMap[issueIdentifier] = issue.id;

          if (!state.issuesMap[issue.id]) {
            state.issuesMap[issue.id] = issue;
          } else {
            state.issuesMap[issue.id] = { ...state.issuesMap[issue.id], ...issue };
          }
        });
      });
    },

    /**
     * @description This method will add issue_identifier to the issuesIdentifierMap
     * @param issueIdentifier
     * @param issueId
     * @returns {void}
     */
    addIssueIdentifier: (issueIdentifier: string, issueId: string) => {
      if (!issueIdentifier || !issueId) return;
      set((state) => {
        state.issuesIdentifierMap[issueIdentifier] = issueId;
      });
    },

    getIssues: async (workspaceSlug: string, projectId: string, issueIds: string[]) => {
      const issueService = get().issueService;
      const issues = await issueService.retrieveIssues(workspaceSlug, projectId, issueIds);

      set((state) => {
        issues.forEach((issue) => {
          if (!state.issuesMap[issue.id]) {
            state.issuesMap[issue.id] = issue;
          }
        });
      });

      return issues;
    },

    /**
     * @description This method will update the issue in the issuesMap
     * @param {string} issueId
     * @param {Partial<TIssue>} issue
     * @returns {void}
     */
    updateIssue: (issueId: string, issue: Partial<TIssue>) => {
      const issuesMap = get().issuesMap;
      if (!issue || !issueId || !issuesMap[issueId]) return;
      set((state) => {
        if (state.issuesMap[issueId]) {
          state.issuesMap[issueId].updated_at = getCurrentDateTimeInISO();
          Object.keys(issue).forEach((key) => {
            const value = issue[key as keyof TIssue];
            if (value !== undefined) {
              (state.issuesMap[issueId] as any)[key] = value;
            }
          });
        }
      });
    },

    /**
     * @description This method will remove the issue from the issuesMap
     * @param {string} issueId
     * @returns {void}
     */
    removeIssue: (issueId: string) => {
      const issuesMap = get().issuesMap;
      if (!issueId || !issuesMap[issueId]) return;
      set((state) => {
        delete state.issuesMap[issueId];
      });
    },

    // helper methods
    /**
     * @description This method will return the issue from the issuesMap
     * @param {string} issueId
     * @returns {TIssue | undefined}
     */
    getIssueById: (issueId: string) => {
      const issuesMap = get().issuesMap;
      if (!issueId || !issuesMap[issueId]) return undefined;
      return issuesMap[issueId];
    },

    /**
     * @description This method will return the issue_id from the issuesIdentifierMap
     * @param {string} issueIdentifier
     * @returns {string | undefined}
     */
    getIssueIdByIdentifier: (issueIdentifier: string) => {
      const issuesIdentifierMap = get().issuesIdentifierMap;
      if (!issueIdentifier || !issuesIdentifierMap[issueIdentifier]) return undefined;
      return issuesIdentifierMap[issueIdentifier];
    },

    /**
     * @description This method will return the issues from the issuesMap
     * @param {string[]} issueIds
     * @param {boolean} archivedIssues
     * @returns {Record<string, TIssue> | undefined}
     */
    getIssuesByIds: (issueIds: string[], type: "archived" | "un-archived") => {
      const issuesMap = get().issuesMap;
      if (!issueIds || issueIds.length <= 0) return [];
      const filteredIssues: TIssue[] = [];
      Object.values(issueIds).forEach((issueId) => {
        // if type is archived then check archived_at is not null
        // if type is un-archived then check archived_at is null
        const issue = issuesMap[issueId];
        if (issue && ((type === "archived" && issue.archived_at) || (type === "un-archived" && !issue?.archived_at))) {
          filteredIssues.push(issue);
        }
      });
      return filteredIssues;
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class IssueStore implements IIssueStore {
  // service
  issueService;

  constructor() {
    this.issueService = new IssueService();
  }

  private get store() {
    return useIssueStore.getState();
  }

  get issuesMap() {
    return this.store.issuesMap;
  }

  get issuesIdentifierMap() {
    return this.store.issuesIdentifierMap;
  }

  addIssue = (issues: TIssue[]) => this.store.addIssue(issues);
  addIssueIdentifier = (issueIdentifier: string, issueId: string) =>
    this.store.addIssueIdentifier(issueIdentifier, issueId);
  getIssues = (workspaceSlug: string, projectId: string, issueIds: string[]) =>
    this.store.getIssues(workspaceSlug, projectId, issueIds);
  updateIssue = (issueId: string, issue: Partial<TIssue>) => this.store.updateIssue(issueId, issue);
  removeIssue = (issueId: string) => this.store.removeIssue(issueId);
  getIssueById = (issueId: string) => this.store.getIssueById(issueId);
  getIssueIdByIdentifier = (issueIdentifier: string) => this.store.getIssueIdByIdentifier(issueIdentifier);
  getIssuesByIds = (issueIds: string[], type: "archived" | "un-archived") => this.store.getIssuesByIds(issueIds, type);
}

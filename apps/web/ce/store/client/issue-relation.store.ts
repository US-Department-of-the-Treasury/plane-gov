import { uniq, get as lodashGet, set as lodashSet } from "lodash-es";
import { create } from "zustand";
// plane imports
import type { TIssueRelationIdMap, TIssueRelationMap, TIssueRelation, TIssue } from "@plane/types";
// components
import type { TRelationObject } from "@/components/issues/issue-detail-widgets/relations";
// Plane-web
import { REVERSE_RELATIONS } from "@/plane-web/constants/gantt-chart";
import type { TIssueRelationTypes } from "@/plane-web/types";
// services
import { IssueRelationService } from "@/services/issue";
// types
import type { IIssueDetail } from "@/core/store/issue/issue-details/root.store";

// Service instance at module level
const issueRelationService = new IssueRelationService();

// State interface
export interface IssueRelationStoreState {
  relationMap: TIssueRelationMap;
  rootIssueDetailStore: IIssueDetail | null;
}

// Actions interface
export interface IssueRelationStoreActions {
  // initialization
  initialize: (rootStore: IIssueDetail) => void;

  // actions
  fetchRelations: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueRelation>;
  createRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    issues: string[]
  ) => Promise<TIssue[]>;
  removeRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    related_issue: string,
    updateLocally?: boolean
  ) => Promise<void>;
  createCurrentRelation: (issueId: string, relationType: TIssueRelationTypes, relatedIssueId: string) => Promise<void>;
  extractRelationsFromIssues: (issues: TIssue[]) => void;

  // helper methods
  getRelationsByIssueId: (issueId: string) => TIssueRelationIdMap | undefined;
  getRelationCountByIssueId: (
    issueId: string,
    ISSUE_RELATION_OPTIONS: { [key in TIssueRelationTypes]?: TRelationObject }
  ) => number;
  getRelationByIssueIdRelationType: (issueId: string, relationType: TIssueRelationTypes) => string[] | undefined;

  // computed
  getIssueRelations: () => TIssueRelationIdMap | undefined;
}

// Combined store type
export type IssueRelationStore = IssueRelationStoreState & IssueRelationStoreActions;

// Initial state
const initialState: IssueRelationStoreState = {
  relationMap: {},
  rootIssueDetailStore: null,
};

/**
 * Issue Relation Store
 *
 * Manages issue relations (blocking, blocked_by, relates_to, duplicate).
 * Migrated from MobX IssueRelationStore to Zustand.
 *
 * Migration notes:
 * - Converted MobX observables to Zustand state
 * - computedFn replaced with regular function
 * - runInAction replaced with set() calls
 */
export const useIssueRelationStore = create<IssueRelationStore>()((set, get) => ({
  ...initialState,

  // initialization
  initialize: (rootStore) => {
    set({ rootIssueDetailStore: rootStore });
  },

  // computed - converted to getter function
  getIssueRelations: () => {
    const state = get();
    const issueId = state.rootIssueDetailStore?.peekIssue?.issueId;
    if (!issueId) return undefined;
    return state.relationMap?.[issueId] ?? undefined;
  },

  // helper methods
  getRelationsByIssueId: (issueId) => {
    if (!issueId) return undefined;
    return get().relationMap?.[issueId] ?? undefined;
  },

  getRelationCountByIssueId: (issueId, ISSUE_RELATION_OPTIONS) => {
    const issueRelations = get().getRelationsByIssueId(issueId);

    const issueRelationKeys = (Object.keys(issueRelations ?? {}) as TIssueRelationTypes[]).filter(
      (relationKey) => !!ISSUE_RELATION_OPTIONS[relationKey]
    );

    return issueRelationKeys.reduce((acc, curr) => acc + (issueRelations?.[curr]?.length ?? 0), 0);
  },

  getRelationByIssueIdRelationType: (issueId, relationType) => {
    if (!issueId || !relationType) return undefined;
    return get().relationMap?.[issueId]?.[relationType] ?? undefined;
  },

  // actions
  fetchRelations: async (workspaceSlug, projectId, issueId) => {
    const response = await issueRelationService.listIssueRelations(workspaceSlug, projectId, issueId);

    const state = get();
    const updatedRelationMap = { ...state.relationMap };

    Object.keys(response).forEach((key) => {
      const relation_key = key as TIssueRelationTypes;
      const relation_issues = response[relation_key];
      const issues = relation_issues.flat().map((issue) => issue);

      if (issues && issues.length > 0) {
        state.rootIssueDetailStore?.rootIssueStore.issues.addIssue(issues);
      }

      lodashSet(
        updatedRelationMap,
        [issueId, relation_key],
        issues && issues.length > 0 ? issues.map((issue) => issue.id) : []
      );
    });

    set({ relationMap: updatedRelationMap });

    return response;
  },

  createRelation: async (workspaceSlug, projectId, issueId, relationType, issues) => {
    const response = await issueRelationService.createIssueRelations(workspaceSlug, projectId, issueId, {
      relation_type: relationType,
      issues,
    });

    const reverseRelatedType = REVERSE_RELATIONS[relationType];
    const state = get();
    const issuesOfRelation = lodashGet(state.relationMap, [issueId, relationType]) ?? [];

    if (response && response.length > 0) {
      const updatedRelationMap = { ...state.relationMap };

      response.forEach((issue) => {
        const issuesOfRelated = lodashGet(updatedRelationMap, [issue.id, reverseRelatedType]);
        state.rootIssueDetailStore?.rootIssueStore.issues.addIssue([issue]);
        issuesOfRelation.push(issue.id);

        if (!issuesOfRelated) {
          lodashSet(updatedRelationMap, [issue.id, reverseRelatedType], [issueId]);
        } else {
          lodashSet(updatedRelationMap, [issue.id, reverseRelatedType], uniq([...issuesOfRelated, issueId]));
        }
      });

      lodashSet(updatedRelationMap, [issueId, relationType], uniq(issuesOfRelation));
      set({ relationMap: updatedRelationMap });
    }

    // fetching activity
    state.rootIssueDetailStore?.activity.fetchActivities(workspaceSlug, projectId, issueId);

    return response;
  },

  /**
   * create Relation in current project optimistically
   * @param issueId
   * @param relationType
   * @param relatedIssueId
   * @returns
   */
  createCurrentRelation: async (issueId, relationType, relatedIssueId) => {
    const state = get();
    const workspaceSlug = state.rootIssueDetailStore?.rootIssueStore.workspaceSlug;
    const projectId = state.rootIssueDetailStore?.issue.getIssueById(issueId)?.project_id;

    if (!workspaceSlug || !projectId) return;

    const reverseRelatedType = REVERSE_RELATIONS[relationType];

    const issuesOfRelation = lodashGet(state.relationMap, [issueId, relationType]);
    const issuesOfRelated = lodashGet(state.relationMap, [relatedIssueId, reverseRelatedType]);

    try {
      // update relations before API call (optimistic update)
      const updatedRelationMap = { ...state.relationMap };

      if (!issuesOfRelation) {
        lodashSet(updatedRelationMap, [issueId, relationType], [relatedIssueId]);
      } else {
        lodashSet(updatedRelationMap, [issueId, relationType], uniq([...issuesOfRelation, relatedIssueId]));
      }

      if (!issuesOfRelated) {
        lodashSet(updatedRelationMap, [relatedIssueId, reverseRelatedType], [issueId]);
      } else {
        lodashSet(updatedRelationMap, [relatedIssueId, reverseRelatedType], uniq([...issuesOfRelated, issueId]));
      }

      set({ relationMap: updatedRelationMap });

      // perform API call
      await issueRelationService.createIssueRelations(workspaceSlug, projectId, issueId, {
        relation_type: relationType,
        issues: [relatedIssueId],
      });
    } catch (e) {
      // Revert back store changes if API fails
      const rollbackRelationMap = { ...get().relationMap };

      if (issuesOfRelation) {
        lodashSet(rollbackRelationMap, [issueId, relationType], issuesOfRelation);
      }

      if (issuesOfRelated) {
        lodashSet(rollbackRelationMap, [relatedIssueId, reverseRelatedType], issuesOfRelated);
      }

      set({ relationMap: rollbackRelationMap });

      throw e;
    }
  },

  removeRelation: async (workspaceSlug, projectId, issueId, relationType, related_issue, updateLocally = false) => {
    try {
      const state = get();
      const relationIndex = state.relationMap[issueId]?.[relationType]?.findIndex(
        (_issueId) => _issueId === related_issue
      );

      if (relationIndex >= 0) {
        const updatedRelationMap = { ...state.relationMap };

        // Create a new array without the removed item
        const updatedRelations = [...(updatedRelationMap[issueId]?.[relationType] ?? [])];
        updatedRelations.splice(relationIndex, 1);

        if (!updatedRelationMap[issueId]) {
          updatedRelationMap[issueId] = {};
        }
        updatedRelationMap[issueId] = {
          ...updatedRelationMap[issueId],
          [relationType]: updatedRelations,
        };

        set({ relationMap: updatedRelationMap });
      }

      if (!updateLocally) {
        await issueRelationService.deleteIssueRelation(workspaceSlug, projectId, issueId, {
          relation_type: relationType,
          related_issue,
        });
      }

      // While removing one relation, reverse of the relation should also be removed
      const reverseRelatedType = REVERSE_RELATIONS[relationType];
      const currentState = get();
      const relatedIndex = currentState.relationMap[related_issue]?.[reverseRelatedType]?.findIndex(
        (_issueId) => _issueId === issueId
      );

      if (relatedIndex >= 0) {
        const updatedRelationMap = { ...currentState.relationMap };

        // Create a new array without the removed item
        const updatedReverseRelations = [...(updatedRelationMap[related_issue]?.[reverseRelatedType] ?? [])];
        updatedReverseRelations.splice(relatedIndex, 1);

        if (!updatedRelationMap[related_issue]) {
          updatedRelationMap[related_issue] = {};
        }
        updatedRelationMap[related_issue] = {
          ...updatedRelationMap[related_issue],
          [reverseRelatedType]: updatedReverseRelations,
        };

        set({ relationMap: updatedRelationMap });
      }

      // fetching activity
      state.rootIssueDetailStore?.activity.fetchActivities(workspaceSlug, projectId, issueId);
    } catch (error) {
      await get().fetchRelations(workspaceSlug, projectId, issueId);
      throw error;
    }
  },

  /**
   * Extract Relation from the issue Array objects and store it in this Store
   * @param issues
   */
  extractRelationsFromIssues: (issues) => {
    try {
      const state = get();
      const updatedRelationMap = { ...state.relationMap };

      for (const issue of issues) {
        const { issue_relation, issue_related, id: issueId } = issue;

        const issueRelations: { [key in TIssueRelationTypes]?: string[] } = {};

        if (issue_relation && Array.isArray(issue_relation) && issue_relation.length) {
          for (const relation of issue_relation) {
            const { relation_type, id } = relation;

            if (!relation_type) continue;

            if (issueRelations[relation_type]) issueRelations[relation_type]?.push(id);
            else issueRelations[relation_type] = [id];
          }
        }

        if (issue_related && Array.isArray(issue_related) && issue_related.length) {
          for (const relation of issue_related) {
            const { relation_type, id } = relation;

            if (!relation_type) continue;

            const reverseRelatedType = REVERSE_RELATIONS[relation_type as TIssueRelationTypes];

            if (issueRelations[reverseRelatedType]) issueRelations[reverseRelatedType]?.push(id);
            else issueRelations[reverseRelatedType] = [id];
          }
        }

        lodashSet(updatedRelationMap, [issueId], issueRelations);
      }

      set({ relationMap: updatedRelationMap });
    } catch (e) {
      console.error("Error while extracting issue relations from issues");
    }
  },
}));

// Legacy interface matching original MobX interface
export interface IIssueRelationStore {
  // observables
  relationMap: TIssueRelationMap;
  // computed
  issueRelations: TIssueRelationIdMap | undefined;
  // helper methods
  getRelationsByIssueId: (issueId: string) => TIssueRelationIdMap | undefined;
  getRelationCountByIssueId: (
    issueId: string,
    ISSUE_RELATION_OPTIONS: { [key in TIssueRelationTypes]?: TRelationObject }
  ) => number;
  getRelationByIssueIdRelationType: (issueId: string, relationType: TIssueRelationTypes) => string[] | undefined;
  extractRelationsFromIssues: (issues: TIssue[]) => void;
  createCurrentRelation: (issueId: string, relationType: TIssueRelationTypes, relatedIssueId: string) => Promise<void>;
  // actions
  fetchRelations: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueRelation>;
  createRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    issues: string[]
  ) => Promise<TIssue[]>;
  removeRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    related_issue: string,
    updateLocally?: boolean
  ) => Promise<void>;
}

// Legacy class wrapper for backward compatibility
export class IssueRelationStoreLegacy implements IIssueRelationStore {
  private rootStore: IIssueDetail;

  constructor(rootStore: IIssueDetail) {
    this.rootStore = rootStore;

    // Initialize the Zustand store with the root store
    useIssueRelationStore.getState().initialize(rootStore);
  }

  // Getters that delegate to Zustand store
  get relationMap(): TIssueRelationMap {
    return useIssueRelationStore.getState().relationMap;
  }

  get issueRelations(): TIssueRelationIdMap | undefined {
    return useIssueRelationStore.getState().getIssueRelations();
  }

  // Helper methods that delegate to Zustand store
  getRelationsByIssueId = (issueId: string): TIssueRelationIdMap | undefined => {
    return useIssueRelationStore.getState().getRelationsByIssueId(issueId);
  };

  getRelationCountByIssueId = (
    issueId: string,
    ISSUE_RELATION_OPTIONS: { [key in TIssueRelationTypes]?: TRelationObject }
  ): number => {
    return useIssueRelationStore.getState().getRelationCountByIssueId(issueId, ISSUE_RELATION_OPTIONS);
  };

  getRelationByIssueIdRelationType = (issueId: string, relationType: TIssueRelationTypes): string[] | undefined => {
    return useIssueRelationStore.getState().getRelationByIssueIdRelationType(issueId, relationType);
  };

  extractRelationsFromIssues = (issues: TIssue[]): void => {
    return useIssueRelationStore.getState().extractRelationsFromIssues(issues);
  };

  createCurrentRelation = async (
    issueId: string,
    relationType: TIssueRelationTypes,
    relatedIssueId: string
  ): Promise<void> => {
    return useIssueRelationStore.getState().createCurrentRelation(issueId, relationType, relatedIssueId);
  };

  // Action methods that delegate to Zustand store
  fetchRelations = async (workspaceSlug: string, projectId: string, issueId: string): Promise<TIssueRelation> => {
    return useIssueRelationStore.getState().fetchRelations(workspaceSlug, projectId, issueId);
  };

  createRelation = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    issues: string[]
  ): Promise<TIssue[]> => {
    return useIssueRelationStore.getState().createRelation(workspaceSlug, projectId, issueId, relationType, issues);
  };

  removeRelation = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    related_issue: string,
    updateLocally?: boolean
  ): Promise<void> => {
    return useIssueRelationStore.getState().removeRelation(
      workspaceSlug,
      projectId,
      issueId,
      relationType,
      related_issue,
      updateLocally
    );
  };
}

// Export the legacy class as IssueRelationStore for backward compatibility
export { IssueRelationStoreLegacy as IssueRelationStore };

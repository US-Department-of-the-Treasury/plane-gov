import { uniq, get as lodashGet, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { TIssueRelationIdMap, TIssueRelationMap, TIssueRelation, TIssue } from "@plane/types";
// components
import type { TRelationObject } from "@/components/issues/issue-detail-widgets/relations";
// Plane-web
import { REVERSE_RELATIONS } from "@/plane-web/constants/gantt-chart";
import type { TIssueRelationTypes } from "@/plane-web/types";
// services
import { IssueRelationService } from "@/services/issue";

export interface IIssueRelationStore {
  // state
  relationMap: TIssueRelationMap;
  // helper methods
  getRelationsByIssueId: (issueId: string) => TIssueRelationIdMap | undefined;
  getRelationCountByIssueId: (
    issueId: string,
    ISSUE_RELATION_OPTIONS: { [key in TIssueRelationTypes]?: TRelationObject }
  ) => number;
  getRelationByIssueIdRelationType: (issueId: string, relationType: TIssueRelationTypes) => string[] | undefined;
  // actions
  fetchRelations: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    onAddIssues?: (issues: TIssue[]) => void
  ) => Promise<TIssueRelation>;
  createRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    issues: string[],
    onAddIssues?: (issues: TIssue[]) => void,
    onFetchActivity?: () => void
  ) => Promise<TIssue[]>;
  removeRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    related_issue: string,
    updateLocally?: boolean,
    onFetchActivity?: () => void
  ) => Promise<void>;
  extractRelationsFromIssues: (issues: TIssue[]) => void;
  createCurrentRelation: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    relatedIssueId: string
  ) => Promise<void>;
}

const issueRelationService = new IssueRelationService();

export const useIssueRelationStore = create<IIssueRelationStore>()(
  immer((set, get) => ({
    // state
    relationMap: {},

    // helper methods
    getRelationsByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      return get().relationMap?.[issueId] ?? undefined;
    },

    getRelationCountByIssueId: (
      issueId: string,
      ISSUE_RELATION_OPTIONS: { [key in TIssueRelationTypes]?: TRelationObject }
    ) => {
      const issueRelations = get().getRelationsByIssueId(issueId);
      const issueRelationKeys = (Object.keys(issueRelations ?? {}) as TIssueRelationTypes[]).filter(
        (relationKey) => !!ISSUE_RELATION_OPTIONS[relationKey]
      );
      return issueRelationKeys.reduce((acc, curr) => acc + (issueRelations?.[curr]?.length ?? 0), 0);
    },

    getRelationByIssueIdRelationType: (issueId: string, relationType: TIssueRelationTypes) => {
      if (!issueId || !relationType) return undefined;
      return get().relationMap?.[issueId]?.[relationType] ?? undefined;
    },

    // actions
    fetchRelations: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      onAddIssues?: (issues: TIssue[]) => void
    ) => {
      const response = await issueRelationService.listIssueRelations(workspaceSlug, projectId, issueId);

      set((state) => {
        Object.keys(response).forEach((key) => {
          const relation_key = key as TIssueRelationTypes;
          const relation_issues = response[relation_key];
          const issues = relation_issues.flat().map((issue) => issue);

          if (issues && issues.length > 0 && onAddIssues) {
            onAddIssues(issues);
          }

          if (!state.relationMap[issueId]) {
            state.relationMap[issueId] = {
              duplicate: [],
              relates_to: [],
              blocked_by: [],
              blocking: [],
            };
          }
          state.relationMap[issueId][relation_key] = issues && issues.length > 0 ? issues.map((issue) => issue.id) : [];
        });
      });

      return response;
    },

    createRelation: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      relationType: TIssueRelationTypes,
      issues: string[],
      onAddIssues?: (issues: TIssue[]) => void,
      onFetchActivity?: () => void
    ) => {
      const response = await issueRelationService.createIssueRelations(workspaceSlug, projectId, issueId, {
        relation_type: relationType,
        issues,
      });

      const reverseRelatedType = REVERSE_RELATIONS[relationType];
      const issuesOfRelation = lodashGet(get().relationMap, [issueId, relationType]) ?? [];

      if (response && response.length > 0) {
        set((state) => {
          response.forEach((issue) => {
            const issuesOfRelated = lodashGet(state.relationMap, [issue.id, reverseRelatedType]);

            if (onAddIssues) {
              onAddIssues([issue]);
            }
            issuesOfRelation.push(issue.id);

            if (!issuesOfRelated) {
              if (!state.relationMap[issue.id]) {
                state.relationMap[issue.id] = {
                  duplicate: [],
                  relates_to: [],
                  blocked_by: [],
                  blocking: [],
                };
              }
              state.relationMap[issue.id][reverseRelatedType] = [issueId];
            } else {
              state.relationMap[issue.id][reverseRelatedType] = uniq([...issuesOfRelated, issueId]);
            }
          });

          if (!state.relationMap[issueId]) {
            state.relationMap[issueId] = {
              duplicate: [],
              relates_to: [],
              blocked_by: [],
              blocking: [],
            };
          }
          state.relationMap[issueId][relationType] = uniq(issuesOfRelation);
        });
      }

      // fetching activity
      if (onFetchActivity) {
        onFetchActivity();
      }

      return response;
    },

    createCurrentRelation: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      relationType: TIssueRelationTypes,
      relatedIssueId: string
    ) => {
      if (!workspaceSlug || !projectId) return;

      const reverseRelatedType = REVERSE_RELATIONS[relationType];
      const issuesOfRelation = lodashGet(get().relationMap, [issueId, relationType]);
      const issuesOfRelated = lodashGet(get().relationMap, [relatedIssueId, reverseRelatedType]);

      try {
        // update relations before API call (optimistic)
        set((state) => {
          if (!state.relationMap[issueId]) {
            state.relationMap[issueId] = {
              duplicate: [],
              relates_to: [],
              blocked_by: [],
              blocking: [],
            };
          }
          if (!issuesOfRelation) {
            state.relationMap[issueId][relationType] = [relatedIssueId];
          } else {
            state.relationMap[issueId][relationType] = uniq([...issuesOfRelation, relatedIssueId]);
          }

          if (!state.relationMap[relatedIssueId]) {
            state.relationMap[relatedIssueId] = {
              duplicate: [],
              relates_to: [],
              blocked_by: [],
              blocking: [],
            };
          }
          if (!issuesOfRelated) {
            state.relationMap[relatedIssueId][reverseRelatedType] = [issueId];
          } else {
            state.relationMap[relatedIssueId][reverseRelatedType] = uniq([...issuesOfRelated, issueId]);
          }
        });

        // perform API call
        await issueRelationService.createIssueRelations(workspaceSlug, projectId, issueId, {
          relation_type: relationType,
          issues: [relatedIssueId],
        });
      } catch (e) {
        // Revert back store changes if API fails
        set((state) => {
          if (issuesOfRelation) {
            state.relationMap[issueId][relationType] = issuesOfRelation;
          } else if (state.relationMap[issueId]) {
            delete state.relationMap[issueId][relationType];
          }

          if (issuesOfRelated) {
            state.relationMap[relatedIssueId][reverseRelatedType] = issuesOfRelated;
          } else if (state.relationMap[relatedIssueId]) {
            delete state.relationMap[relatedIssueId][reverseRelatedType];
          }
        });

        throw e;
      }
    },

    removeRelation: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      relationType: TIssueRelationTypes,
      related_issue: string,
      updateLocally = false,
      onFetchActivity?: () => void
    ) => {
      try {
        const state = get();
        const relationIndex = state.relationMap[issueId]?.[relationType]?.findIndex(
          (_issueId) => _issueId === related_issue
        );

        if (relationIndex !== undefined && relationIndex >= 0) {
          set((draft) => {
            draft.relationMap[issueId]?.[relationType]?.splice(relationIndex, 1);
          });
        }

        if (!updateLocally) {
          await issueRelationService.deleteIssueRelation(workspaceSlug, projectId, issueId, {
            relation_type: relationType,
            related_issue,
          });
        }

        // While removing one relation, reverse of the relation should also be removed
        const reverseRelatedType = REVERSE_RELATIONS[relationType];
        const relatedIndex = get().relationMap[related_issue]?.[reverseRelatedType]?.findIndex(
          (_issueId) => _issueId === issueId
        );

        if (relatedIndex !== undefined && relatedIndex >= 0) {
          set((draft) => {
            draft.relationMap[related_issue]?.[reverseRelatedType]?.splice(relatedIndex, 1);
          });
        }

        // fetching activity
        if (onFetchActivity) {
          onFetchActivity();
        }
      } catch (error) {
        // Refetch on error
        await get().fetchRelations(workspaceSlug, projectId, issueId);
        throw error;
      }
    },

    extractRelationsFromIssues: (issues: TIssue[]) => {
      try {
        set((state) => {
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

            state.relationMap[issueId] = {
              duplicate: issueRelations.duplicate ?? [],
              relates_to: issueRelations.relates_to ?? [],
              blocked_by: issueRelations.blocked_by ?? [],
              blocking: issueRelations.blocking ?? [],
            };
          }
        });
      } catch (e) {
        console.error("Error while extracting issue relations from issues");
      }
    },
  }))
);

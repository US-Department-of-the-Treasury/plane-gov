/**
 * DEPRECATED: This hook has been migrated from MobX to TanStack Query.
 *
 * The MobX-based store pattern has been replaced with TanStack Query hooks for better
 * performance, simpler state management, and automatic caching/refetching.
 *
 * For new code, use the TanStack Query hooks directly from:
 * @see apps/web/core/store/queries/issue.ts
 *
 * Available hooks:
 * - useIssues(workspaceSlug, projectId, filters) - Fetch issues for a project
 * - useSprintIssues(workspaceSlug, projectId, sprintId) - Fetch sprint issues
 * - useModuleIssues(workspaceSlug, projectId, moduleId) - Fetch module issues
 * - useIssue(workspaceSlug, projectId, issueId) - Fetch single issue
 * - useCreateIssue() - Create issue mutation
 * - useUpdateIssue() - Update issue mutation
 * - useDeleteIssue() - Delete issue mutation
 *
 * Migration example:
 * ```ts
 * // Old MobX pattern:
 * const { issues, issuesFilter } = useIssues(EIssuesStoreType.PROJECT);
 *
 * // New TanStack Query pattern:
 * import { useIssues } from "@/store/queries/issue";
 * const { data: issues, isLoading } = useIssues(workspaceSlug, projectId, filters);
 * ```
 */

import { useContext } from "react";
import { merge } from "lodash-es";
import type { TIssueMap } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { StoreContext } from "@/lib/store-context";
// types
import type { ITeamIssues, ITeamIssuesFilter } from "@/plane-web/store/issue/team";
import type { ITeamProjectWorkItemsFilter, ITeamProjectWorkItems } from "@/plane-web/store/issue/team-project";
import type { ITeamViewIssues, ITeamViewIssuesFilter } from "@/plane-web/store/issue/team-views";
import type { IWorkspaceIssues } from "@/plane-web/store/issue/workspace/issue.store";
import type { IArchivedIssues, IArchivedIssuesFilter } from "@/store/issue/archived";
import type { ISprintIssues, ISprintIssuesFilter } from "@/store/issue/sprint";
import type { IEpicIssues, IEpicIssuesFilter } from "@/store/issue/epic";
import type { IProfileIssues, IProfileIssuesFilter } from "@/store/issue/profile";
import type { IProjectIssues, IProjectIssuesFilter } from "@/store/issue/project";
import type { IProjectViewIssues, IProjectViewIssuesFilter } from "@/store/issue/project-views";
import type { IWorkspaceIssuesFilter } from "@/store/issue/workspace";
import type { IWorkspaceDraftIssues, IWorkspaceDraftIssuesFilter } from "@/store/issue/workspace-draft";

type defaultIssueStore = {
  issueMap: TIssueMap;
};

export type TStoreIssues = {
  [EIssuesStoreType.GLOBAL]: defaultIssueStore & {
    issues: IWorkspaceIssues;
    issuesFilter: IWorkspaceIssuesFilter;
  };
  [EIssuesStoreType.WORKSPACE_DRAFT]: defaultIssueStore & {
    issues: IWorkspaceDraftIssues;
    issuesFilter: IWorkspaceDraftIssuesFilter;
  };
  [EIssuesStoreType.PROFILE]: defaultIssueStore & {
    issues: IProfileIssues;
    issuesFilter: IProfileIssuesFilter;
  };
  [EIssuesStoreType.TEAM]: defaultIssueStore & {
    issues: ITeamIssues;
    issuesFilter: ITeamIssuesFilter;
  };
  [EIssuesStoreType.PROJECT]: defaultIssueStore & {
    issues: IProjectIssues;
    issuesFilter: IProjectIssuesFilter;
  };
  [EIssuesStoreType.SPRINT]: defaultIssueStore & {
    issues: ISprintIssues;
    issuesFilter: ISprintIssuesFilter;
  };
  [EIssuesStoreType.EPIC]: defaultIssueStore & {
    issues: IEpicIssues;
    issuesFilter: IEpicIssuesFilter;
  };
  [EIssuesStoreType.TEAM_VIEW]: defaultIssueStore & {
    issues: ITeamViewIssues;
    issuesFilter: ITeamViewIssuesFilter;
  };
  [EIssuesStoreType.PROJECT_VIEW]: defaultIssueStore & {
    issues: IProjectViewIssues;
    issuesFilter: IProjectViewIssuesFilter;
  };
  [EIssuesStoreType.ARCHIVED]: defaultIssueStore & {
    issues: IArchivedIssues;
    issuesFilter: IArchivedIssuesFilter;
  };
  [EIssuesStoreType.DEFAULT]: defaultIssueStore & {
    issues: IProjectIssues;
    issuesFilter: IProjectIssuesFilter;
  };
  [EIssuesStoreType.TEAM_PROJECT_WORK_ITEMS]: defaultIssueStore & {
    issues: ITeamProjectWorkItems;
    issuesFilter: ITeamProjectWorkItemsFilter;
  };
};

/**
 * @deprecated Use TanStack Query hooks from @/store/queries/issue.ts instead
 * This MobX-based hook is maintained for backward compatibility only.
 */
export const useIssues = <T extends EIssuesStoreType>(storeType?: T): TStoreIssues[T] => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useIssues must be used within StoreProvider");

  const defaultStore: defaultIssueStore = {
    issueMap: context.issue.issues.issuesMap,
  };

  switch (storeType) {
    case EIssuesStoreType.GLOBAL:
      return merge(defaultStore, {
        issues: context.issue.workspaceIssues,
        issuesFilter: context.issue.workspaceIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.WORKSPACE_DRAFT:
      return merge(defaultStore, {
        issues: context.issue.workspaceDraftIssues,
        issuesFilter: context.issue.workspaceDraftIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.PROFILE:
      return merge(defaultStore, {
        issues: context.issue.profileIssues,
        issuesFilter: context.issue.profileIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.TEAM:
      return merge(defaultStore, {
        issues: context.issue.teamIssues,
        issuesFilter: context.issue.teamIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.PROJECT:
      return merge(defaultStore, {
        issues: context.issue.projectIssues,
        issuesFilter: context.issue.projectIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.SPRINT:
      return merge(defaultStore, {
        issues: context.issue.sprintIssues,
        issuesFilter: context.issue.sprintIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.EPIC:
      return merge(defaultStore, {
        issues: context.issue.epicIssues,
        issuesFilter: context.issue.epicIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.TEAM_VIEW:
      return merge(defaultStore, {
        issues: context.issue.teamViewIssues,
        issuesFilter: context.issue.teamViewIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.PROJECT_VIEW:
      return merge(defaultStore, {
        issues: context.issue.projectViewIssues,
        issuesFilter: context.issue.projectViewIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.ARCHIVED:
      return merge(defaultStore, {
        issues: context.issue.archivedIssues,
        issuesFilter: context.issue.archivedIssuesFilter,
      }) as TStoreIssues[T];
    case EIssuesStoreType.TEAM_PROJECT_WORK_ITEMS:
      return merge(defaultStore, {
        issues: context.issue.teamProjectWorkItems,
        issuesFilter: context.issue.teamProjectWorkItemsFilter,
      }) as TStoreIssues[T];
    default:
      return merge(defaultStore, {
        issues: context.issue.projectIssues,
        issuesFilter: context.issue.projectIssuesFilter,
      }) as TStoreIssues[T];
  }
};

// Re-export TanStack Query hooks for convenience
export {
  useIssue,
  useIssueByIdentifier,
  useIssues as useIssuesQuery,
  useSprintIssues,
  useModuleIssues,
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
  useArchiveIssue,
  useIssueActivities,
  useSubIssues,
  useAddSubIssues,
  useIssueLinks,
  useCreateIssueLink,
  useUpdateIssueLink,
  useDeleteIssueLink,
  useIssueSubscription,
  useToggleIssueSubscription,
  useBulkIssueOperations,
  useBulkDeleteIssues,
  useBulkArchiveIssues,
  useAddIssueToSprint,
  useRemoveIssueFromSprint,
} from "@/store/queries/issue";

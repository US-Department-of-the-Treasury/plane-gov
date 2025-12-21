import { useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
// plane imports
import type { TWorkItemFilterCondition } from "@plane/shared-state";
import { EIssuesStoreType } from "@plane/types";
// constants
import { CYCLE_ISSUES_WITH_PARAMS } from "@/constants/fetch-keys";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useWorkItemFilters } from "@/hooks/store/work-item-filters/use-work-item-filters";

interface IActiveSprintDetails {
  workspaceSlug: string;
  projectId: string;
  sprintId: string | null | undefined;
}

const useSprintsDetails = (props: IActiveSprintDetails) => {
  // props
  const { workspaceSlug, projectId, sprintId } = props;
  // router
  const router = useRouter();
  // store hooks
  const {
    issuesFilter: { updateFilterExpression },
    issues: { getActiveSprintById: getActiveSprintByIdFromIssue, fetchActiveSprintIssues },
  } = useIssues(EIssuesStoreType.CYCLE);
  const { updateFilterExpressionFromConditions } = useWorkItemFilters();

  const { fetchActiveSprintProgress, getSprintById, fetchActiveSprintAnalytics } = useSprint();
  // derived values
  const sprint = sprintId ? getSprintById(sprintId) : null;

  // fetch sprint details
  useSWR(
    workspaceSlug && projectId && sprint?.id ? `PROJECT_ACTIVE_CYCLE_${projectId}_PROGRESS_${sprint.id}` : null,
    workspaceSlug && projectId && sprint?.id ? () => fetchActiveSprintProgress(workspaceSlug, projectId, sprint.id) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );
  useSWR(
    workspaceSlug && projectId && sprint?.id && !sprint?.distribution
      ? `PROJECT_ACTIVE_CYCLE_${projectId}_DURATION_${sprint.id}`
      : null,
    workspaceSlug && projectId && sprint?.id && !sprint?.distribution
      ? () => fetchActiveSprintAnalytics(workspaceSlug, projectId, sprint.id, "issues")
      : null
  );
  useSWR(
    workspaceSlug && projectId && sprint?.id && !sprint?.estimate_distribution
      ? `PROJECT_ACTIVE_CYCLE_${projectId}_ESTIMATE_DURATION_${sprint.id}`
      : null,
    workspaceSlug && projectId && sprint?.id && !sprint?.estimate_distribution
      ? () => fetchActiveSprintAnalytics(workspaceSlug, projectId, sprint.id, "points")
      : null
  );
  useSWR(
    workspaceSlug && projectId && sprint?.id ? CYCLE_ISSUES_WITH_PARAMS(sprint?.id, { priority: "urgent,high" }) : null,
    workspaceSlug && projectId && sprint?.id
      ? () => fetchActiveSprintIssues(workspaceSlug, projectId, 30, sprint?.id)
      : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  const sprintIssueDetails = sprint?.id ? getActiveSprintByIdFromIssue(sprint?.id) : { nextPageResults: false };

  const handleFiltersUpdate = useCallback(
    async (conditions: TWorkItemFilterCondition[]) => {
      if (!workspaceSlug || !projectId || !sprintId) return;

      await updateFilterExpressionFromConditions(
        EIssuesStoreType.CYCLE,
        sprintId,
        conditions,
        updateFilterExpression.bind(updateFilterExpression, workspaceSlug, projectId, sprintId)
      );

      router.push(`/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}`);
    },
    [workspaceSlug, projectId, sprintId, updateFilterExpressionFromConditions, updateFilterExpression, router]
  );
  return {
    sprint,
    sprintId,
    router,
    handleFiltersUpdate,
    sprintIssueDetails,
  };
};
export default useSprintsDetails;

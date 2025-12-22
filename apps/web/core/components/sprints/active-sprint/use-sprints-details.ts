import { useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
// plane imports
import type { TWorkItemFilterCondition } from "@plane/shared-state";
import { EIssuesStoreType } from "@plane/types";
// constants
import { SPRINT_ISSUES_WITH_PARAMS } from "@/constants/fetch-keys";
// hooks
import { useSprintDetails, useSprintProgress } from "@/store/queries/sprint";
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
  } = useIssues(EIssuesStoreType.SPRINT);
  const { updateFilterExpressionFromConditions } = useWorkItemFilters();

  // TanStack Query hooks
  const { data: sprint } = useSprintDetails(workspaceSlug, projectId, sprintId || "");
  useSprintProgress(workspaceSlug, projectId, sprintId || "");

  // fetch active sprint issues
  useSWR(
    workspaceSlug && projectId && sprint?.id ? SPRINT_ISSUES_WITH_PARAMS(sprint?.id, { priority: "urgent,high" }) : null,
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
        EIssuesStoreType.SPRINT,
        sprintId,
        conditions,
        updateFilterExpression.bind(updateFilterExpression, workspaceSlug, projectId, sprintId)
      );

      router.push(`/${workspaceSlug}/projects/${projectId}/sprints/${sprintId}`);
    },
    [workspaceSlug, projectId, sprintId, updateFilterExpressionFromConditions, updateFilterExpression, router]
  );
  return {
    sprint: sprint || null,
    sprintId,
    router,
    handleFiltersUpdate,
    sprintIssueDetails,
  };
};
export default useSprintsDetails;

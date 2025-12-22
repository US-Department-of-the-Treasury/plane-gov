import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane imports
import type { TWorkItemFilterCondition } from "@plane/shared-state";
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useSprintDetails, useSprintProgress } from "@/store/queries/sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useWorkItemFilters } from "@/hooks/store/work-item-filters/use-work-item-filters";
import { queryKeys } from "@/store/queries/query-keys";

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
  useQuery({
    queryKey: queryKeys.issues.sprint(sprint?.id || ""),
    queryFn: () => fetchActiveSprintIssues(workspaceSlug, projectId, 30, sprint!.id),
    enabled: !!(workspaceSlug && projectId && sprint?.id),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

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

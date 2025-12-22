import { useQuery } from "@tanstack/react-query";
// plane web imports
import { useWorkspaceIssuePropertiesExtended } from "@/plane-web/hooks/use-workspace-issue-properties-extended";
// plane imports
import { useProjectEstimates } from "./store/estimates";
import { useLabel } from "./store/use-label";
import { useWorkspaceEpics } from "@/store/queries/epic";
import { useWorkspaceSprints } from "@/store/queries/sprint";
import { queryKeys } from "@/store/queries/query-keys";

export const useWorkspaceIssueProperties = (workspaceSlug: string | string[] | undefined) => {
  const { fetchWorkspaceLabels } = useLabel();

  const { getWorkspaceEstimates } = useProjectEstimates();

  // fetch workspace Epics - handled by TanStack Query useWorkspaceEpics hook
  useWorkspaceEpics(workspaceSlug ? workspaceSlug.toString() : "");

  // fetch workspace Sprints - handled by TanStack Query useWorkspaceSprints hook
  useWorkspaceSprints(workspaceSlug ? workspaceSlug.toString() : "");

  const workspaceSlugString = workspaceSlug ? workspaceSlug.toString() : "";

  // fetch workspace labels
  useQuery({
    queryKey: queryKeys.labels.workspace(workspaceSlugString),
    queryFn: () => fetchWorkspaceLabels(workspaceSlugString),
    enabled: !!workspaceSlug,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // fetch workspace estimates
  useQuery({
    queryKey: queryKeys.estimates.workspace(workspaceSlugString),
    queryFn: () => getWorkspaceEstimates(workspaceSlugString),
    enabled: !!workspaceSlug,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // fetch extended issue properties
  useWorkspaceIssuePropertiesExtended(workspaceSlug);
};

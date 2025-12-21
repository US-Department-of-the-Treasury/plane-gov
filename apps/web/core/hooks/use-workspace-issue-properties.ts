import useSWR from "swr";
// plane web imports
import { WORKSPACE_ESTIMATES, WORKSPACE_SPRINTS, WORKSPACE_LABELS, WORKSPACE_MODULES } from "@/constants/fetch-keys";
import { useWorkspaceIssuePropertiesExtended } from "@/plane-web/hooks/use-workspace-issue-properties-extended";
// plane imports
import { useProjectEstimates } from "./store/estimates";
import { useSprint } from "./store/use-sprint";
import { useLabel } from "./store/use-label";
import { useEpic } from "./store/use-module";

export const useWorkspaceIssueProperties = (workspaceSlug: string | string[] | undefined) => {
  const { fetchWorkspaceLabels } = useLabel();

  const { getWorkspaceEstimates } = useProjectEstimates();

  const { fetchWorkspaceEpics } = useEpic();

  const { fetchWorkspaceSprints } = useSprint();

  // fetch workspace Epics
  useSWR(
    workspaceSlug ? WORKSPACE_MODULES(workspaceSlug.toString()) : null,
    workspaceSlug ? () => fetchWorkspaceEpics(workspaceSlug.toString()) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  // fetch workspace Sprints
  useSWR(
    workspaceSlug ? WORKSPACE_SPRINTS(workspaceSlug.toString()) : null,
    workspaceSlug ? () => fetchWorkspaceSprints(workspaceSlug.toString()) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  // fetch workspace labels
  useSWR(
    workspaceSlug ? WORKSPACE_LABELS(workspaceSlug.toString()) : null,
    workspaceSlug ? () => fetchWorkspaceLabels(workspaceSlug.toString()) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  // fetch workspace estimates
  useSWR(
    workspaceSlug ? WORKSPACE_ESTIMATES(workspaceSlug.toString()) : null,
    workspaceSlug ? () => getWorkspaceEstimates(workspaceSlug.toString()) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  // fetch extended issue properties
  useWorkspaceIssuePropertiesExtended(workspaceSlug);
};

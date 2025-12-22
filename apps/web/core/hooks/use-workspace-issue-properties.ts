import useSWR from "swr";
// plane web imports
import { WORKSPACE_ESTIMATES, WORKSPACE_LABELS } from "@/constants/fetch-keys";
import { useWorkspaceIssuePropertiesExtended } from "@/plane-web/hooks/use-workspace-issue-properties-extended";
// plane imports
import { useProjectEstimates } from "./store/estimates";
import { useLabel } from "./store/use-label";
import { useWorkspaceModules } from "@/store/queries/module";
import { useWorkspaceSprints } from "@/store/queries/sprint";

export const useWorkspaceIssueProperties = (workspaceSlug: string | string[] | undefined) => {
  const { fetchWorkspaceLabels } = useLabel();

  const { getWorkspaceEstimates } = useProjectEstimates();

  // fetch workspace Modules - handled by TanStack Query useWorkspaceModules hook
  useWorkspaceModules(workspaceSlug ? workspaceSlug.toString() : "");

  // fetch workspace Sprints - handled by TanStack Query useWorkspaceSprints hook
  useWorkspaceSprints(workspaceSlug ? workspaceSlug.toString() : "");

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

import { useProjectEstimates } from "./store/estimates";
import { useLabel } from "./store/use-label";
import { useMember } from "./store/use-member";

export const useProjectIssueProperties = () => {
  const {
    project: { fetchProjectMembers },
  } = useMember();
  const { fetchProjectLabels } = useLabel();
  const { getProjectEstimates } = useProjectEstimates();

  // fetching project states - handled by TanStack Query useProjectStates hook
  // This function is kept for backward compatibility but is a no-op
  // Components should use useProjectStates(workspaceSlug, projectId) directly
  const fetchStates = async (
    _workspaceSlug: string | string[] | undefined,
    _projectId: string | string[] | undefined
  ) => {
    // No-op: TanStack Query handles fetching automatically via useProjectStates hook
  };
  // fetching project members
  const fetchMembers = async (
    workspaceSlug: string | string[] | undefined,
    projectId: string | string[] | undefined
  ) => {
    if (workspaceSlug && projectId) {
      await fetchProjectMembers(workspaceSlug.toString(), projectId.toString());
    }
  };

  // fetching project labels
  const fetchLabels = async (
    workspaceSlug: string | string[] | undefined,
    projectId: string | string[] | undefined
  ) => {
    if (workspaceSlug && projectId) {
      await fetchProjectLabels(workspaceSlug.toString(), projectId.toString());
    }
  };
  // fetching project sprints - handled by TanStack Query useProjectSprints hook
  // This function is kept for backward compatibility but is a no-op
  // Components should use useProjectSprints(workspaceSlug, projectId) directly
  const fetchSprints = async (
    _workspaceSlug: string | string[] | undefined,
    _projectId: string | string[] | undefined
  ) => {
    // No-op: TanStack Query handles fetching automatically via useProjectSprints hook
  };
  // fetching project epics - handled by TanStack Query useProjectEpics hook
  // This function is kept for backward compatibility but is a no-op
  // Components should use useProjectEpics(workspaceSlug, projectId) directly
  const fetchEpics = async (
    _workspaceSlug: string | string[] | undefined,
    _projectId: string | string[] | undefined
  ) => {
    // No-op: TanStack Query handles fetching automatically via useProjectEpics hook
  };
  // fetching project estimates
  const fetchEstimates = async (
    workspaceSlug: string | string[] | undefined,
    projectId: string | string[] | undefined
  ) => {
    if (workspaceSlug && projectId) {
      await getProjectEstimates(workspaceSlug.toString(), projectId.toString());
    }
  };

  const fetchAll = async (workspaceSlug: string | string[] | undefined, projectId: string | string[] | undefined) => {
    if (workspaceSlug && projectId) {
      await fetchStates(workspaceSlug, projectId);
      await fetchMembers(workspaceSlug, projectId);
      await fetchLabels(workspaceSlug, projectId);
      await fetchSprints(workspaceSlug, projectId);
      await fetchEpics(workspaceSlug, projectId);
      await fetchEstimates(workspaceSlug, projectId);
    }
  };

  return {
    fetchAll,
    fetchStates,
    fetchMembers,
    fetchLabels,
    fetchSprints,
    fetchEpics,
    fetchEstimates,
  };
};

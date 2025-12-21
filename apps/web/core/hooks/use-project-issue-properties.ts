import { useProjectEstimates } from "./store/estimates";
import { useSprint } from "./store/use-sprint";
import { useLabel } from "./store/use-label";
import { useMember } from "./store/use-member";
import { useEpic } from "./store/use-epic";
import { useProjectState } from "./store/use-project-state";

export const useProjectIssueProperties = () => {
  const { fetchProjectStates } = useProjectState();
  const {
    project: { fetchProjectMembers },
  } = useMember();
  const { fetchProjectLabels } = useLabel();
  const { fetchAllSprints: fetchProjectAllSprints } = useSprint();
  const { fetchEpics: fetchProjectAllEpics } = useEpic();
  const { getProjectEstimates } = useProjectEstimates();

  // fetching project states
  const fetchStates = async (
    workspaceSlug: string | string[] | undefined,
    projectId: string | string[] | undefined
  ) => {
    if (workspaceSlug && projectId) {
      await fetchProjectStates(workspaceSlug.toString(), projectId.toString());
    }
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
  // fetching project sprints
  const fetchSprints = async (
    workspaceSlug: string | string[] | undefined,
    projectId: string | string[] | undefined
  ) => {
    if (workspaceSlug && projectId) {
      await fetchProjectAllSprints(workspaceSlug.toString(), projectId.toString());
    }
  };
  // fetching project epics
  const fetchEpics = async (
    workspaceSlug: string | string[] | undefined,
    projectId: string | string[] | undefined
  ) => {
    if (workspaceSlug && projectId) {
      await fetchProjectAllEpics(workspaceSlug.toString(), projectId.toString());
    }
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

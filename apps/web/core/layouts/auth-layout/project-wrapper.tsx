import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import useSWR from "swr";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { GANTT_TIMELINE_TYPE } from "@plane/types";
// components
import { ProjectAccessRestriction } from "@/components/auth-screens/project/project-access-restriction";
import {
  PROJECT_DETAILS,
  PROJECT_ME_INFORMATION,
  PROJECT_MEMBER_PREFERENCES,
  PROJECT_STATES,
  PROJECT_ESTIMATES,
  PROJECT_ALL_SPRINTS,
  PROJECT_EPICS,
  PROJECT_VIEWS,
  PROJECT_INTAKE_STATE,
} from "@/constants/fetch-keys";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useProjectView } from "@/hooks/store/use-project-view";
import { useUser, useUserPermissions } from "@/hooks/store/user";
import { useTimeLineChart } from "@/hooks/use-timeline-chart";
import { useProjectLabels } from "@/store/queries/label";
import { useProjectMembers } from "@/store/queries/member";
import { useProjectEpics } from "@/store/queries/epic";
import { useProjectDetails } from "@/store/queries/project";
import { useProjectStates, useIntakeState } from "@/store/queries/state";
import { useProjectSprints } from "@/store/queries/sprint";

interface IProjectAuthWrapper {
  workspaceSlug: string;
  projectId: string;
  children: ReactNode;
  isLoading?: boolean;
}

export function ProjectAuthWrapper(props: IProjectAuthWrapper) {
  const { workspaceSlug, projectId, children, isLoading: isParentLoading = false } = props;
  // states
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  // store hooks
  const { fetchUserProjectInfo, allowPermissions, getProjectRoleByWorkspaceSlugAndProjectId } = useUserPermissions();
  const { joinProject } = useUserPermissions();
  const { initGantt } = useTimeLineChart(GANTT_TIMELINE_TYPE.EPIC);
  const { fetchViews } = useProjectView();
  const { data: currentUserData } = useUser();
  const { getProjectEstimates } = useProjectEstimates();
  // TanStack Query - auto-fetches project details, states, intake state, sprints, epics, and members
  const { isLoading: isProjectDetailsLoading, error: projectDetailsError } = useProjectDetails(workspaceSlug, projectId);
  useProjectStates(workspaceSlug, projectId);
  useIntakeState(workspaceSlug, projectId);
  useProjectSprints(workspaceSlug, projectId);
  useProjectEpics(workspaceSlug, projectId);
  useProjectMembers(workspaceSlug, projectId);
  // derived values
  const hasPermissionToCurrentProject = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER, EUserPermissions.GUEST],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );
  const currentProjectRole = getProjectRoleByWorkspaceSlugAndProjectId(workspaceSlug, projectId);
  const isWorkspaceAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE, workspaceSlug);
  // Initialize epic timeline chart
  useEffect(() => {
    initGantt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetching user project member information
  useSWR(PROJECT_ME_INFORMATION(workspaceSlug, projectId), () => fetchUserProjectInfo(workspaceSlug, projectId));
  // fetching project labels - TanStack Query auto-fetches
  useProjectLabels(workspaceSlug, projectId);
  // fetching project estimates
  useSWR(PROJECT_ESTIMATES(projectId, currentProjectRole), () => getProjectEstimates(workspaceSlug, projectId), {
    revalidateIfStale: false,
    revalidateOnFocus: false,
  });
  // fetching project sprints - handled by TanStack Query useProjectSprints hook above
  // fetching project epics - handled by TanStack Query useProjectEpics hook above
  // fetching project views
  useSWR(PROJECT_VIEWS(projectId, currentProjectRole), () => fetchViews(workspaceSlug, projectId), {
    revalidateIfStale: false,
    revalidateOnFocus: false,
  });

  // handle join project
  const handleJoinProject = () => {
    setIsJoiningProject(true);
    joinProject(workspaceSlug, projectId).finally(() => setIsJoiningProject(false));
  };

  const isProjectLoading = (isParentLoading || isProjectDetailsLoading) && !projectDetailsError;

  if (isProjectLoading) return null;

  if (!isProjectLoading && hasPermissionToCurrentProject === false) {
    return (
      <ProjectAccessRestriction
        errorStatusCode={projectDetailsError?.status}
        isWorkspaceAdmin={isWorkspaceAdmin}
        handleJoinProject={handleJoinProject}
        isJoinButtonDisabled={isJoiningProject}
      />
    );
  }

  return <>{children}</>;
}

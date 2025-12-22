import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { GANTT_TIMELINE_TYPE } from "@plane/types";
// components
import { ProjectAccessRestriction } from "@/components/auth-screens/project/project-access-restriction";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useProjectView } from "@/hooks/store/use-project-view";
import { useCurrentUser } from "@/store/queries/user";
import { useUserPermissions } from "@/hooks/store/user";
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
  const { data: currentUserData } = useCurrentUser();
  const { getProjectEstimates } = useProjectEstimates();
  // TanStack Query - auto-fetches project details, states, intake state, sprints, epics, and members
  const { isLoading: isProjectDetailsLoading, error: projectDetailsError } = useProjectDetails(
    workspaceSlug,
    projectId
  );
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

  // TanStack Query - fetching user project member information
  useQuery({
    queryKey: ["project-member-me", workspaceSlug, projectId],
    queryFn: () => fetchUserProjectInfo(workspaceSlug, projectId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  // fetching project labels - TanStack Query auto-fetches
  useProjectLabels(workspaceSlug, projectId);
  // TanStack Query - fetching project estimates
  useQuery({
    queryKey: ["project-estimates", projectId, currentProjectRole],
    queryFn: () => getProjectEstimates(workspaceSlug, projectId),
    enabled: !!currentProjectRole,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  // fetching project sprints - handled by TanStack Query useProjectSprints hook above
  // fetching project epics - handled by TanStack Query useProjectEpics hook above
  // TanStack Query - fetching project views
  useQuery({
    queryKey: ["project-views", projectId, currentProjectRole],
    queryFn: () => fetchViews(workspaceSlug, projectId),
    enabled: !!currentProjectRole,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
        errorStatusCode={(projectDetailsError as any)?.status}
        isWorkspaceAdmin={isWorkspaceAdmin}
        handleJoinProject={handleJoinProject}
        isJoinButtonDisabled={isJoiningProject}
      />
    );
  }

  return <>{children}</>;
}

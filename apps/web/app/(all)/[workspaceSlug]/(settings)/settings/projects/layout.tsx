import { useEffect } from "react";
import { observer } from "mobx-react";
import { Outlet } from "react-router";
// hooks
import { useProjects, getJoinedProjectIds } from "@/store/queries/project";
import { useAppRouter } from "@/hooks/use-app-router";
// types
import type { Route } from "./+types/layout";

function ProjectSettingsLayout({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  // router
  const router = useAppRouter();
  // store hooks
  const { data: projects } = useProjects(workspaceSlug);
  const joinedProjectIds = getJoinedProjectIds(projects);

  useEffect(() => {
    if (projectId) return;
    if (joinedProjectIds.length > 0) {
      router.push(`/${workspaceSlug}/settings/projects/${joinedProjectIds[0]}`);
    }
  }, [joinedProjectIds, router, workspaceSlug, projectId]);

  return <Outlet />;
}

export default observer(ProjectSettingsLayout);

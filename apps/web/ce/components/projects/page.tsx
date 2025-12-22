import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// components
import { ProjectRoot } from "@/components/project/root";
// hooks
import { useProjects } from "@/store/queries/project";
import { useWorkspaceDetails } from "@/store/queries/workspace";

export const ProjectPageRoot = observer(function ProjectPageRoot() {
  // router
  const { workspaceSlug } = useParams();
  // store
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug?.toString() ?? "");
  // fetching workspace projects - TanStack Query handles this automatically
  useProjects(workspaceSlug?.toString() ?? "");

  return <ProjectRoot />;
});

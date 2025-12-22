import { observer } from "mobx-react";
// plane types
import type { IPartialProject } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKProjectsMenu } from "@/components/power-k/menus/projects";
// hooks
import { useParams } from "next/navigation";
// queries
import { useProjects, getJoinedProjectIds } from "@/store/queries/project";

type Props = {
  handleSelect: (project: IPartialProject) => void;
};

export const PowerKOpenProjectMenu = observer(function PowerKOpenProjectMenu(props: Props) {
  const { handleSelect } = props;
  // router
  const { workspaceSlug } = useParams();
  // queries
  const { data: projects, isLoading } = useProjects(workspaceSlug?.toString());
  // derived values
  const joinedProjectIds = getJoinedProjectIds(projects);
  const projectsList = joinedProjectIds
    ? joinedProjectIds.map((id) => projects?.find((p) => p.id === id)).filter((project) => project !== undefined)
    : [];

  if (isLoading) return <Spinner />;

  return <PowerKProjectsMenu projects={projectsList} onSelect={handleSelect} />;
});

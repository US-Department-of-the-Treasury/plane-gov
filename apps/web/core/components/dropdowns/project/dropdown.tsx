import type { ReactNode } from "react";
import { observer } from "mobx-react";
// store hooks
import { useProjects, getProjectById, getJoinedProjectIds } from "@/store/queries/project";
// local imports
import type { TDropdownProps } from "../types";
import { ProjectDropdownBase } from "./base";

type Props = TDropdownProps & {
  button?: ReactNode;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  onClose?: () => void;
  renderCondition?: (projectId: string) => boolean;
  renderByDefault?: boolean;
  currentProjectId?: string;
} & (
    | {
        multiple: false;
        onChange: (val: string) => void;
        value: string | null;
      }
    | {
        multiple: true;
        onChange: (val: string[]) => void;
        value: string[];
      }
  );

export const ProjectDropdown = observer(function ProjectDropdown(props: Props) {
  const { workspaceSlug } = props;
  // store hooks
  const { data: projects } = useProjects(workspaceSlug);

  // derived values
  const joinedProjectIds = projects ? getJoinedProjectIds(projects) : [];
  const getProjectByIdFn = (projectId: string) => getProjectById(projects || [], projectId);

  return <ProjectDropdownBase {...props} getProjectById={getProjectByIdFn} projectIds={joinedProjectIds} />;
});

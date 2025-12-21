import type { ReactNode } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// hooks
import { useEpic } from "@/hooks/store/use-module";
// types
import type { TDropdownProps } from "../types";
// local imports
import { EpicDropdownBase } from "./base";

type TEpicDropdownProps = TDropdownProps & {
  button?: ReactNode;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  projectId: string | undefined;
  showCount?: boolean;
  onClose?: () => void;
  renderByDefault?: boolean;
  itemClassName?: string;
} & (
    | {
        multiple: false;
        onChange: (val: string | null) => void;
        value: string | null;
      }
    | {
        multiple: true;
        onChange: (val: string[]) => void;
        value: string[] | null;
      }
  );

export const EpicDropdown = observer(function EpicDropdown(props: TEpicDropdownProps) {
  const { projectId } = props;
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { getEpicById, getProjectEpicIds, fetchEpics } = useEpic();
  // derived values
  const epicIds = projectId ? getProjectEpicIds(projectId) : [];

  const onDropdownOpen = () => {
    if (!epicIds && projectId && workspaceSlug) fetchEpics(workspaceSlug.toString(), projectId);
  };

  return (
    <EpicDropdownBase
      {...props}
      getEpicById={getEpicById}
      epicIds={epicIds ?? []}
      onDropdownOpen={onDropdownOpen}
    />
  );
});

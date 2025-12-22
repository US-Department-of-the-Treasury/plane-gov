import type { ReactNode } from "react";
import { useParams } from "next/navigation";
// hooks
import { useProjectEpics, getEpicById, getEpicIds } from "@/store/queries/epic";
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

export function EpicDropdown(props: TEpicDropdownProps) {
  const { projectId } = props;
  // router
  const { workspaceSlug } = useParams();
  // fetch epics using TanStack Query
  const { data: epics } = useProjectEpics(workspaceSlug?.toString() ?? "", projectId ?? "");
  // derived values
  const epicIds = epics ? getEpicIds(epics) : [];

  return (
    <EpicDropdownBase
      {...props}
      getEpicById={(epicId: string) => getEpicById(epics, epicId) ?? null}
      epicIds={epicIds}
      onDropdownOpen={() => {}} // TanStack Query handles fetching automatically
    />
  );
}

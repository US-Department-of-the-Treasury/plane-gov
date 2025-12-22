import type { ReactNode } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// hooks
import { useProjectModules, getModuleById, getModuleIds } from "@/store/queries/module";
// types
import type { TDropdownProps } from "../types";
// local imports
import { ModuleDropdownBase } from "./base";

type TModuleDropdownProps = TDropdownProps & {
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

export const ModuleDropdown = observer(function ModuleDropdown(props: TModuleDropdownProps) {
  const { projectId } = props;
  // router
  const { workspaceSlug } = useParams();
  // fetch modules using TanStack Query
  const { data: modules } = useProjectModules(
    workspaceSlug?.toString() ?? "",
    projectId ?? ""
  );
  // derived values
  const moduleIds = modules ? getModuleIds(modules) : [];

  return (
    <ModuleDropdownBase
      {...props}
      getModuleById={(moduleId: string) => getModuleById(modules, moduleId)}
      moduleIds={moduleIds}
      onDropdownOpen={() => {}} // TanStack Query handles fetching automatically
    />
  );
});

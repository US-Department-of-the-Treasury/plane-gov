import { useParams } from "next/navigation";
// hooks
import { useProjectStates, getStateById, getStateIds } from "@/store/queries/state";
// local imports
import type { TWorkItemStateDropdownBaseProps } from "./base";
import { WorkItemStateDropdownBase } from "./base";

type TWorkItemStateDropdownProps = Omit<
  TWorkItemStateDropdownBaseProps,
  "stateIds" | "getStateById" | "onDropdownOpen" | "isInitializing"
> & {
  stateIds?: string[];
};

export const StateDropdown = function StateDropdown(props: TWorkItemStateDropdownProps) {
  const { projectId, stateIds: propsStateIds } = props;
  // router params
  const { workspaceSlug } = useParams();
  // store hooks
  const { data: states, isLoading } = useProjectStates(workspaceSlug?.toString() ?? "", projectId ?? "");
  // derived values
  const stateIds = propsStateIds ?? (states ? getStateIds(states) : []);

  return (
    <WorkItemStateDropdownBase
      {...props}
      getStateById={(stateId: string | null | undefined) => getStateById(states ?? [], stateId)}
      isInitializing={isLoading}
      stateIds={stateIds}
      onDropdownOpen={() => {}}
    />
  );
};

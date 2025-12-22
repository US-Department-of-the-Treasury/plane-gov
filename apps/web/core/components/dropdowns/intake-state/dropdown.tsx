import { useParams } from "next/navigation";
// hooks
import { useIntakeState } from "@/store/queries/state";
// local imports
import type { TWorkItemStateDropdownBaseProps } from "./base";
import { WorkItemStateDropdownBase } from "./base";

type TWorkItemStateDropdownProps = Omit<
  TWorkItemStateDropdownBaseProps,
  "stateIds" | "getStateById" | "onDropdownOpen" | "isInitializing"
> & {
  stateIds?: string[];
};

export function IntakeStateDropdown(props: TWorkItemStateDropdownProps) {
  const { projectId, stateIds: propsStateIds } = props;
  // router params
  const { workspaceSlug } = useParams();
  // store hooks
  const { data: intakeState, isLoading } = useIntakeState(workspaceSlug?.toString() ?? "", projectId ?? "");
  // derived values
  const stateIds = propsStateIds ?? (intakeState ? [intakeState.id] : []);
  const getStateById = (stateId: string | null | undefined) =>
    intakeState && stateId && intakeState.id === stateId ? intakeState : undefined;

  return (
    <WorkItemStateDropdownBase
      {...props}
      getStateById={getStateById}
      isInitializing={isLoading}
      stateIds={stateIds}
      onDropdownOpen={() => {}}
    />
  );
}

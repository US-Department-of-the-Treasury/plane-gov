import { Command } from "cmdk";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
// plane imports
import { EIconSize } from "@plane/constants";
import { StateGroupIcon } from "@plane/propel/icons";
import { Spinner } from "@plane/ui";
// store hooks
import { useProjectStates } from "@/store/queries/state";

export type TChangeWorkItemStateListProps = {
  projectId: string | null;
  currentStateId: string | null;
  handleStateChange: (stateId: string) => void;
};

export function ChangeWorkItemStateList(props: TChangeWorkItemStateListProps) {
  const { projectId, currentStateId, handleStateChange } = props;
  // router
  const params = useParams();
  const workspaceSlug = params.workspaceSlug?.toString();
  // queries
  const { data: projectStates, isLoading } = useProjectStates(workspaceSlug ?? "", projectId ?? "");

  return (
    <>
      {isLoading ? (
        <Spinner />
      ) : projectStates && projectStates.length > 0 ? (
        projectStates.map((state) => (
          <Command.Item key={state.id} onSelect={() => handleStateChange(state.id)} className="focus:outline-none">
            <div className="flex items-center space-x-3">
              <StateGroupIcon
                stateGroup={state.group}
                color={state.color}
                size={EIconSize.LG}
                percentage={state?.order}
              />
              <p>{state.name}</p>
            </div>
            <div>{state.id === currentStateId && <Check className="h-3 w-3" />}</div>
          </Command.Item>
        ))
      ) : (
        <div className="text-center">No states found</div>
      )}
    </>
  );
}

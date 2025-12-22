import { Command } from "cmdk";
// plane types
import { useParams } from "next/navigation";
import type { TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// hooks
import { useProjectStates } from "@/store/queries/state";
// local imports
import { PowerKProjectStatesMenuItems } from "@/plane-web/components/command-palette/power-k/pages/context-based/work-item/state-menu-item";

type Props = {
  handleSelect: (stateId: string) => void;
  workItemDetails: TIssue;
};

export function PowerKProjectStatesMenu(props: Props) {
  const { workItemDetails } = props;
  // router
  const { workspaceSlug } = useParams();

  // TanStack Query - auto-fetches project states
  const { data: states, isLoading } = useProjectStates(
    workspaceSlug?.toString() || "",
    workItemDetails.project_id || ""
  );

  if (isLoading || !states) return <Spinner />;

  return (
    <Command.Group>
      <PowerKProjectStatesMenuItems
        {...props}
        projectId={workItemDetails.project_id ?? undefined}
        selectedStateId={workItemDetails.state_id ?? undefined}
        states={states}
        workspaceSlug={workspaceSlug?.toString()}
      />
    </Command.Group>
  );
}

import { useParams } from "next/navigation";
// plane types
import type { IEpic, TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKEpicsMenu } from "@/components/power-k/menus/epics";
// hooks
import { useProjectEpics } from "@/store/queries";

type Props = {
  handleSelect: (epic: IEpic) => void;
  workItemDetails: TIssue;
};

export function PowerKWorkItemEpicsMenu(props: Props) {
  const { handleSelect, workItemDetails } = props;
  // hooks
  const { workspaceSlug } = useParams();
  const { data: epics, isLoading } = useProjectEpics(workspaceSlug?.toString() ?? "", workItemDetails.project_id ?? "");
  // derived values
  const filteredEpicsList = epics ? epics.filter((epic) => !!epic) : undefined;

  if (isLoading || !filteredEpicsList) return <Spinner />;

  return <PowerKEpicsMenu epics={filteredEpicsList} onSelect={handleSelect} value={workItemDetails.epic_ids ?? []} />;
}

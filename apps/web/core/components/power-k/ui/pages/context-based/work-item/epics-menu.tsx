import { observer } from "mobx-react";
// plane types
import type { IEpic, TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKEpicsMenu } from "@/components/power-k/menus/epics";
// hooks
import { useEpic } from "@/hooks/store/use-module";

type Props = {
  handleSelect: (epic: IEpic) => void;
  workItemDetails: TIssue;
};

export const PowerKWorkItemEpicsMenu = observer(function PowerKWorkItemEpicsMenu(props: Props) {
  const { handleSelect, workItemDetails } = props;
  // store hooks
  const { getProjectEpicIds, getEpicById } = useEpic();
  // derived values
  const projectEpicIds = workItemDetails.project_id ? getProjectEpicIds(workItemDetails.project_id) : undefined;
  const epicsList = projectEpicIds ? projectEpicIds.map((epicId) => getEpicById(epicId)) : undefined;
  const filteredEpicsList = epicsList ? epicsList.filter((epic) => !!epic) : undefined;

  if (!filteredEpicsList) return <Spinner />;

  return (
    <PowerKEpicsMenu epics={filteredEpicsList} onSelect={handleSelect} value={workItemDetails.epic_ids ?? []} />
  );
});

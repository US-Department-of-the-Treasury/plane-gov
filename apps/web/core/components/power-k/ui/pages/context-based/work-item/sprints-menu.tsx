import { observer } from "mobx-react";
// plane types
import type { ISprint, TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKSprintsMenu } from "@/components/power-k/menus/sprints";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";

type Props = {
  handleSelect: (sprint: ISprint) => void;
  workItemDetails: TIssue;
};

export const PowerKWorkItemSprintsMenu = observer(function PowerKWorkItemSprintsMenu(props: Props) {
  const { handleSelect, workItemDetails } = props;
  // store hooks
  const { currentWorkspaceSprintIds, getSprintById } = useSprint();
  // derived values
  const sprintsList = currentWorkspaceSprintIds
    ? currentWorkspaceSprintIds.map((sprintId) => getSprintById(sprintId))
    : undefined;
  const filteredSprintsList = sprintsList ? sprintsList.filter((sprint) => !!sprint) : undefined;

  if (!filteredSprintsList) return <Spinner />;

  return <PowerKSprintsMenu sprints={filteredSprintsList} onSelect={handleSelect} value={workItemDetails.sprint_id} />;
});

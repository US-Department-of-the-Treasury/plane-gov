import { observer } from "mobx-react";
// plane types
import type { IEpic, TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKModulesMenu } from "@/components/power-k/menus/modules";
// hooks
import { useEpic } from "@/hooks/store/use-module";

type Props = {
  handleSelect: (module: IModule) => void;
  workItemDetails: TIssue;
};

export const PowerKWorkItemEpicsMenu = observer(function PowerKWorkItemEpicsMenu(props: Props) {
  const { handleSelect, workItemDetails } = props;
  // store hooks
  const { getProjectEpicIds, getEpicById } = useEpic();
  // derived values
  const projectModuleIds = workItemDetails.project_id ? getProjectEpicIds(workItemDetails.project_id) : undefined;
  const modulesList = projectModuleIds ? projectModuleIds.map((epicId) => getEpicById(epicId)) : undefined;
  const filteredModulesList = modulesList ? modulesList.filter((module) => !!module) : undefined;

  if (!filteredModulesList) return <Spinner />;

  return (
    <PowerKModulesMenu modules={filteredModulesList} onSelect={handleSelect} value={workItemDetails.epic_ids ?? []} />
  );
});

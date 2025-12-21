import { observer } from "mobx-react";
// plane types
import type { IModule } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import type { TPowerKContext } from "@/components/power-k/core/types";
import { PowerKModulesMenu } from "@/components/power-k/menus/modules";
// hooks
import { useEpic } from "@/hooks/store/use-module";

type Props = {
  context: TPowerKContext;
  handleSelect: (module: IModule) => void;
};

export const PowerKOpenProjectEpicsMenu = observer(function PowerKOpenProjectEpicsMenu(props: Props) {
  const { context, handleSelect } = props;
  // store hooks
  const { fetchedMap, getProjectEpicIds, getEpicById } = useEpic();
  // derived values
  const projectId = context.params.projectId?.toString();
  const isFetched = projectId ? fetchedMap[projectId] : false;
  const projectModuleIds = projectId ? getProjectEpicIds(projectId) : undefined;
  const modulesList = projectModuleIds
    ? projectModuleIds.map((epicId) => getEpicById(epicId)).filter((module) => !!module)
    : [];

  if (!isFetched) return <Spinner />;

  return <PowerKModulesMenu modules={modulesList} onSelect={handleSelect} />;
});

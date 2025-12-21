import { observer } from "mobx-react";
// plane types
import type { IEpic } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import type { TPowerKContext } from "@/components/power-k/core/types";
import { PowerKEpicsMenu } from "@/components/power-k/menus/epics";
// hooks
import { useEpic } from "@/hooks/store/use-module";

type Props = {
  context: TPowerKContext;
  handleSelect: (epic: IEpic) => void;
};

export const PowerKOpenProjectEpicsMenu = observer(function PowerKOpenProjectEpicsMenu(props: Props) {
  const { context, handleSelect } = props;
  // store hooks
  const { fetchedMap, getProjectEpicIds, getEpicById } = useEpic();
  // derived values
  const projectId = context.params.projectId?.toString();
  const isFetched = projectId ? fetchedMap[projectId] : false;
  const projectEpicIds = projectId ? getProjectEpicIds(projectId) : undefined;
  const epicsList = projectEpicIds
    ? projectEpicIds.map((epicId) => getEpicById(epicId)).filter((epic) => !!epic)
    : [];

  if (!isFetched) return <Spinner />;

  return <PowerKEpicsMenu epics={epicsList} onSelect={handleSelect} />;
});

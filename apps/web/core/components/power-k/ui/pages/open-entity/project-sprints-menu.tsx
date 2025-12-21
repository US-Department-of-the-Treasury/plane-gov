import { observer } from "mobx-react";
// plane types
import type { ISprint } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import type { TPowerKContext } from "@/components/power-k/core/types";
import { PowerKSprintsMenu } from "@/components/power-k/menus/sprints";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";

type Props = {
  context: TPowerKContext;
  handleSelect: (sprint: ISprint) => void;
};

export const PowerKOpenProjectSprintsMenu = observer(function PowerKOpenProjectSprintsMenu(props: Props) {
  const { context, handleSelect } = props;
  // store hooks
  const { fetchedMap, currentWorkspaceSprintIds, getSprintById } = useSprint();
  // derived values
  const workspaceSlug = context.params.workspaceSlug?.toString();
  const isFetched = workspaceSlug ? fetchedMap[workspaceSlug] : false;
  const sprintsList = currentWorkspaceSprintIds
    ? currentWorkspaceSprintIds.map((sprintId) => getSprintById(sprintId)).filter((sprint) => !!sprint)
    : [];

  if (!isFetched) return <Spinner />;

  return <PowerKSprintsMenu sprints={sprintsList} onSelect={handleSelect} />;
});

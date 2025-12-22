// plane types
import type { IEpic } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import type { TPowerKContext } from "@/components/power-k/core/types";
import { PowerKEpicsMenu } from "@/components/power-k/menus/epics";
// hooks
import { useProjectEpics } from "@/store/queries";

type Props = {
  context: TPowerKContext;
  handleSelect: (epic: IEpic) => void;
};

export function PowerKOpenProjectEpicsMenu(props: Props) {
  const { context, handleSelect } = props;
  // hooks
  const workspaceSlug = context.params.workspaceSlug?.toString() ?? "";
  const projectId = context.params.projectId?.toString() ?? "";
  const { data: epics, isLoading } = useProjectEpics(workspaceSlug, projectId);
  // derived values
  const epicsList = epics ? epics.filter((epic) => !!epic) : [];

  if (isLoading) return <Spinner />;

  return <PowerKEpicsMenu epics={epicsList} onSelect={handleSelect} />;
}

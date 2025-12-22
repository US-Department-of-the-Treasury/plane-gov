// plane types
import type { ISprint } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import type { TPowerKContext } from "@/components/power-k/core/types";
import { PowerKSprintsMenu } from "@/components/power-k/menus/sprints";
// hooks
import { useWorkspaceSprints } from "@/store/queries/sprint";

type Props = {
  context: TPowerKContext;
  handleSelect: (sprint: ISprint) => void;
};

export function PowerKOpenProjectSprintsMenu(props: Props) {
  const { context, handleSelect } = props;
  // derived values
  const workspaceSlug = context.params.workspaceSlug?.toString();
  // queries
  const { data: sprints, isLoading } = useWorkspaceSprints(workspaceSlug ?? "");
  const sprintsList = sprints?.filter((sprint) => !!sprint) ?? [];

  if (isLoading) return <Spinner />;

  return <PowerKSprintsMenu sprints={sprintsList} onSelect={handleSelect} />;
}

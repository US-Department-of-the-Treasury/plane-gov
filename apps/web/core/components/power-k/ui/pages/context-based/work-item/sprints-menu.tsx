import { useParams } from "next/navigation";
// plane types
import type { ISprint, TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKSprintsMenu } from "@/components/power-k/menus/sprints";
// hooks
import { useWorkspaceSprints } from "@/store/queries/sprint";

type Props = {
  handleSelect: (sprint: ISprint) => void;
  workItemDetails: TIssue;
};

export function PowerKWorkItemSprintsMenu(props: Props) {
  const { handleSelect, workItemDetails } = props;
  // router
  const { workspaceSlug } = useParams();
  // queries
  const { data: sprints, isLoading } = useWorkspaceSprints(workspaceSlug?.toString() ?? "");
  // derived values
  const filteredSprintsList = sprints?.filter((sprint) => !!sprint) ?? [];

  if (isLoading || !sprints) return <Spinner />;

  return <PowerKSprintsMenu sprints={filteredSprintsList} onSelect={handleSelect} value={workItemDetails.sprint_id} />;
}

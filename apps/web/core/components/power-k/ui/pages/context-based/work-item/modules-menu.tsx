// plane types
import { useParams } from "next/navigation";
import type { IModule, TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKModulesMenu } from "@/components/power-k/menus/modules";
// hooks
import { useProjectModules, getActiveModules } from "@/store/queries/module";

type Props = {
  handleSelect: (module: IModule) => void;
  workItemDetails: TIssue;
};

export function PowerKWorkItemModulesMenu(props: Props) {
  const { handleSelect, workItemDetails } = props;
  // router params
  const { workspaceSlug } = useParams();
  const projectId = workItemDetails.project_id ?? "";
  // queries
  const { data: modules, isLoading } = useProjectModules(workspaceSlug?.toString() ?? "", projectId);
  // derived values
  const activeModules = getActiveModules(modules);

  if (isLoading || !activeModules) return <Spinner />;

  return (
    <PowerKModulesMenu modules={activeModules} onSelect={handleSelect} value={workItemDetails.module_ids ?? []} />
  );
}

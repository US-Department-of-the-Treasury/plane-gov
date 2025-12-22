// plane types
import type { IModule } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import type { TPowerKContext } from "@/components/power-k/core/types";
import { PowerKModulesMenu } from "@/components/power-k/menus/modules";
// hooks
import { useProjectModules, getActiveModules } from "@/store/queries/module";

type Props = {
  context: TPowerKContext;
  handleSelect: (module: IModule) => void;
};

export function PowerKOpenProjectModulesMenu(props: Props) {
  const { context, handleSelect } = props;
  // derived values
  const workspaceSlug = context.params.workspaceSlug?.toString() ?? "";
  const projectId = context.params.projectId?.toString() ?? "";
  // queries
  const { data: modules, isLoading } = useProjectModules(workspaceSlug, projectId);
  const activeModules = getActiveModules(modules);

  if (isLoading) return <Spinner />;

  return <PowerKModulesMenu modules={activeModules} onSelect={handleSelect} />;
}

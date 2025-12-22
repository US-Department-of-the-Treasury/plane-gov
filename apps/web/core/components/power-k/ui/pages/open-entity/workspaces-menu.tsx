// plane types
import type { IWorkspace } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKWorkspacesMenu } from "@/components/power-k/menus/workspaces";
// hooks
import { useWorkspaces } from "@/store/queries/workspace";

type Props = {
  handleSelect: (workspace: IWorkspace) => void;
};

export function PowerKOpenWorkspaceMenu(props: Props) {
  const { handleSelect } = props;
  // store hooks
  const { data: workspaces, isLoading: loader } = useWorkspaces();
  // derived values
  const workspacesList = workspaces ?? [];

  if (loader) return <Spinner />;

  return <PowerKWorkspacesMenu workspaces={workspacesList} onSelect={handleSelect} />;
}

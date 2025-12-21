import { observer } from "mobx-react";
import { useEffect } from "react";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useSprint } from "@/hooks/store/use-sprint";
import { useWorkspace } from "@/hooks/store/use-workspace";
// local imports
import { ResourceMatrix } from "./resource-matrix";

export const ResourceViewRoot = observer(function ResourceViewRoot() {
  const { currentWorkspace } = useWorkspace();
  const { workspace: workspaceMemberStore } = useMember();
  const sprintStore = useSprint();

  const workspaceSlug = currentWorkspace?.slug;

  // Fetch workspace members and sprints on mount
  useEffect(() => {
    if (!workspaceSlug) return;

    void workspaceMemberStore.fetchWorkspaceMembers(workspaceSlug);
    void sprintStore.fetchWorkspaceSprints(workspaceSlug);
  }, [workspaceSlug, workspaceMemberStore, sprintStore]);

  if (!workspaceSlug) {
    return null;
  }

  return <ResourceMatrix workspaceSlug={workspaceSlug} />;
});

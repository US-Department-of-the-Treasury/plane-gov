import { useInstanceStore } from "@/store/client";

export const getIsWorkspaceCreationDisabled = () => {
  const instanceConfig = useInstanceStore.getState().config;

  return instanceConfig?.is_workspace_creation_disabled;
};

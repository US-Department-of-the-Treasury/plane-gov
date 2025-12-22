import type { FC } from "react";
import { useMemo } from "react";
// components
import { EUserPermissionsLevel } from "@plane/constants";
import type { IState, TStateOperationsCallbacks } from "@plane/types";
import { EUserProjectRoles } from "@plane/types";
import { ProjectStateLoader, GroupList } from "@/components/project-states";
// hooks
import {
  useGroupedProjectStates,
  useCreateState,
  useUpdateState,
  useDeleteState,
  useMoveStatePosition,
  useMarkStateAsDefault,
} from "@/store/queries/state";
import { useUserPermissions } from "@/hooks/store/user";

type TProjectState = {
  workspaceSlug: string;
  projectId: string;
};

export const ProjectStateRoot = function ProjectStateRoot(props: TProjectState) {
  const { workspaceSlug, projectId } = props;
  // hooks
  const { data: groupedProjectStates, isLoading } = useGroupedProjectStates(workspaceSlug, projectId);
  const { mutate: createState } = useCreateState();
  const { mutate: updateState } = useUpdateState();
  const { mutate: deleteState } = useDeleteState();
  const { mutate: moveStatePosition } = useMoveStatePosition();
  const { mutate: markStateAsDefault } = useMarkStateAsDefault();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const isEditable = allowPermissions(
    [EUserProjectRoles.ADMIN],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  // State operations callbacks
  const stateOperationsCallbacks: TStateOperationsCallbacks = useMemo(
    () => ({
      createState: async (data: Partial<IState>) => createState({ workspaceSlug, projectId, data }),
      updateState: async (stateId: string, data: Partial<IState>) =>
        updateState({ workspaceSlug, projectId, stateId, data }),
      deleteState: async (stateId: string) => deleteState({ workspaceSlug, projectId, stateId }),
      moveStatePosition: async (stateId: string, data: Partial<IState>) =>
        moveStatePosition({ workspaceSlug, projectId, stateId, data }),
      markStateAsDefault: async (stateId: string) => markStateAsDefault({ workspaceSlug, projectId, stateId }),
    }),
    [workspaceSlug, projectId, createState, moveStatePosition, updateState, deleteState, markStateAsDefault]
  );

  // Loader
  if (isLoading || !groupedProjectStates) return <ProjectStateLoader />;

  return (
    <div className="py-3">
      <GroupList
        groupedStates={groupedProjectStates}
        stateOperationsCallbacks={stateOperationsCallbacks}
        isEditable={isEditable}
        shouldTrackEvents
      />
    </div>
  );
};

import { observer } from "mobx-react";
// components
import { SprintCreateUpdateModal } from "@/components/sprints/modal";
import { CreateUpdateEpicModal } from "@/components/epics";
import { CreatePageModal } from "@/components/pages/modals/create-page-modal";
import { CreateUpdateProjectViewModal } from "@/components/views/modal";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
// plane web hooks
import { EPageStoreType } from "@/plane-web/hooks/store";

export type TProjectLevelModalsProps = {
  workspaceSlug: string;
  projectId: string;
};

export const ProjectLevelModals = observer(function ProjectLevelModals(props: TProjectLevelModalsProps) {
  const { workspaceSlug, projectId } = props;
  // store hooks
  const {
    isCreateSprintModalOpen,
    toggleCreateSprintModal,
    isCreateEpicModalOpen,
    toggleCreateEpicModal,
    isCreateViewModalOpen,
    toggleCreateViewModal,
    createPageModal,
    toggleCreatePageModal,
  } = useCommandPalette();

  return (
    <>
      <SprintCreateUpdateModal
        isOpen={isCreateSprintModalOpen}
        handleClose={() => toggleCreateSprintModal(false)}
        workspaceSlug={workspaceSlug.toString()}
        projectId={projectId.toString()}
      />
      <CreateUpdateEpicModal
        isOpen={isCreateEpicModalOpen}
        onClose={() => toggleCreateEpicModal(false)}
        workspaceSlug={workspaceSlug.toString()}
        projectId={projectId.toString()}
      />
      <CreateUpdateProjectViewModal
        isOpen={isCreateViewModalOpen}
        onClose={() => toggleCreateViewModal(false)}
        workspaceSlug={workspaceSlug.toString()}
        projectId={projectId.toString()}
      />
      <CreatePageModal
        workspaceSlug={workspaceSlug.toString()}
        projectId={projectId.toString()}
        isModalOpen={createPageModal.isOpen}
        pageAccess={createPageModal.pageAccess}
        handleModalClose={() => toggleCreatePageModal({ isOpen: false })}
        redirectionEnabled
        storeType={EPageStoreType.PROJECT}
      />
    </>
  );
});

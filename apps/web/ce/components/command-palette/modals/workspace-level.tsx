// components
import { CreateProjectModal } from "@/components/project/create-project-modal";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";

export type TWorkspaceLevelModalsProps = {
  workspaceSlug: string;
};

export function WorkspaceLevelModals(props: TWorkspaceLevelModalsProps) {
  const { workspaceSlug } = props;
  // store hooks
  const { isCreateProjectModalOpen, toggleCreateProjectModal } = useCommandPalette();

  return (
    <>
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => toggleCreateProjectModal(false)}
        workspaceSlug={workspaceSlug.toString()}
      />
    </>
  );
}

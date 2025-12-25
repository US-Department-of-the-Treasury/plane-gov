import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@plane/propel/primitives";
import { getAssetIdFromUrl, checkURLValidity } from "@plane/utils";
// plane web components
import { CreateProjectForm } from "@/plane-web/components/projects/create/root";
// plane web types
import type { TProject } from "@/plane-web/types/projects";
// services
import { FileService } from "@/services/file.service";
const fileService = new FileService();

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setToFavorite?: boolean;
  workspaceSlug: string;
  data?: Partial<TProject>;
  templateId?: string;
};

export function CreateProjectModal(props: Props) {
  const { isOpen, onClose, setToFavorite = false, workspaceSlug, data, templateId } = props;
  const router = useRouter();

  // Gov fork: Skip feature selection modal - all features enabled by default
  // Navigate directly to the new project after creation
  const handleNextStep = (projectId: string) => {
    if (!projectId) return;
    onClose();
    router.push(`/${workspaceSlug}/projects/${projectId}/issues`);
  };

  const handleCoverImageStatusUpdate = async (projectId: string, coverImage: string) => {
    if (!checkURLValidity(coverImage)) {
      await fileService.updateBulkProjectAssetsUploadStatus(workspaceSlug, projectId, projectId, {
        asset_ids: [getAssetIdFromUrl(coverImage)],
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="top-[10%] translate-y-0 sm:max-w-2xl" showCloseButton={false}>
        <CreateProjectForm
          setToFavorite={setToFavorite}
          workspaceSlug={workspaceSlug}
          onClose={onClose}
          updateCoverImageStatus={handleCoverImageStatusUpdate}
          handleNextStep={handleNextStep}
          data={data}
          templateId={templateId}
        />
      </DialogContent>
    </Dialog>
  );
}

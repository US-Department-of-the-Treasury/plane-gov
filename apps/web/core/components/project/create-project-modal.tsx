/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, react-hooks/set-state-in-effect */
// NOTE: Above disables are for pre-existing type resolution issues in monorepo
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@plane/propel/primitives";
// eslint-disable-next-line import/no-unresolved -- @plane/utils is a valid workspace package
import { getAssetIdFromUrl, checkURLValidity } from "@plane/utils";
// plane web components
import { CreateProjectForm } from "@/plane-web/components/projects/create/root";
// plane web types
import type { TProject } from "@/plane-web/types/projects";
// services
import { FileService } from "@/services/file.service";
const fileService = new FileService();
import { ProjectFeatureUpdate } from "./project-feature-update";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setToFavorite?: boolean;
  workspaceSlug: string;
  data?: Partial<TProject>;
  templateId?: string;
};

enum EProjectCreationSteps {
  CREATE_PROJECT = "CREATE_PROJECT",
  FEATURE_SELECTION = "FEATURE_SELECTION",
}

export function CreateProjectModal(props: Props) {
  const { isOpen, onClose, setToFavorite = false, workspaceSlug, data, templateId } = props;
  // states
  const [currentStep, setCurrentStep] = useState<EProjectCreationSteps>(EProjectCreationSteps.CREATE_PROJECT);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(EProjectCreationSteps.CREATE_PROJECT);
      setCreatedProjectId(null);
    }
  }, [isOpen]);

  const handleNextStep = (projectId: string) => {
    if (!projectId) return;
    setCreatedProjectId(projectId);
    setCurrentStep(EProjectCreationSteps.FEATURE_SELECTION);
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
        {currentStep === EProjectCreationSteps.CREATE_PROJECT && (
          <CreateProjectForm
            setToFavorite={setToFavorite}
            workspaceSlug={workspaceSlug}
            onClose={onClose}
            updateCoverImageStatus={handleCoverImageStatusUpdate}
            handleNextStep={handleNextStep}
            data={data}
            templateId={templateId}
          />
        )}
        {currentStep === EProjectCreationSteps.FEATURE_SELECTION && (
          <ProjectFeatureUpdate projectId={createdProjectId} workspaceSlug={workspaceSlug} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
// ui
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useEpicDetails, useArchiveEpic } from "@/store/queries/epic";

type Props = {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
  handleClose: () => void;
  isOpen: boolean;
  onSubmit?: () => Promise<void>;
};

export function ArchiveEpicModal(props: Props) {
  const { workspaceSlug, projectId, epicId, isOpen, handleClose } = props;
  // router
  const router = useAppRouter();
  // states
  const [isArchiving, setIsArchiving] = useState(false);
  // queries
  const { data: epicDetails } = useEpicDetails(workspaceSlug, projectId, epicId);
  const { mutateAsync: archiveEpic } = useArchiveEpic();

  const epicName = epicDetails?.name;

  const onClose = () => {
    setIsArchiving(false);
    handleClose();
  };

  const handleArchiveEpic = async () => {
    setIsArchiving(true);
    await archiveEpic({ workspaceSlug, projectId, epicId })
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Archive success",
          message: "Your archives can be found in project archives.",
        });
        onClose();
        router.push(`/${workspaceSlug}/projects/${projectId}/epics`);
      })
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Epic could not be archived. Please try again.",
        })
      )
      .finally(() => setIsArchiving(false));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogContent
              showCloseButton={false}
              className="relative transform overflow-hidden rounded-lg bg-surface-1 text-left shadow-raised-200 sm:my-8 sm:w-full sm:max-w-lg static translate-x-0 translate-y-0 p-0 border-0"
            >
              <div className="px-5 py-4">
                <h3 className="text-18 font-medium 2xl:text-20">Archive epic {epicName}</h3>
                <p className="mt-3 text-13 text-secondary">
                  Are you sure you want to archive the epic? All your archives can be restored later.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="lg" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="lg" tabIndex={0} onClick={handleArchiveEpic} loading={isArchiving}>
                    {isArchiving ? "Archiving" : "Archive"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

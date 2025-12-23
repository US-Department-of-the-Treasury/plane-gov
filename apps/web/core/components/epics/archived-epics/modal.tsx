import { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
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

  return (
    <Transition.Root show={isOpen} as="div">
      <Dialog as="div" className="relative z-20" onClose={onClose}>
        <Transition.Child
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-backdrop transition-opacity"
        />

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Dialog.Panel}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              className="relative transform overflow-hidden rounded-lg bg-surface-1 text-left shadow-raised-200 transition-all sm:my-8 sm:w-full sm:max-w-lg"
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
                    <Button variant="primary" size="lg" tabIndex={1} onClick={handleArchiveEpic} loading={isArchiving}>
                      {isArchiving ? "Archiving" : "Archive"}
                    </Button>
                  </div>
                </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

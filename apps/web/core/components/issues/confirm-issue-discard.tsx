import React, { useState } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@plane/propel/primitives";
// ui
import { Button } from "@plane/propel/button";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  onDiscard: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmIssueDiscard(props: Props) {
  const { isOpen, handleClose, onDiscard, onConfirm } = props;

  const [isLoading, setIsLoading] = useState(false);

  const onClose = () => {
    handleClose();
    setIsLoading(false);
  };

  const handleDeletion = async () => {
    setIsLoading(true);
    await onConfirm();
    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="my-10 flex items-center justify-center p-4 text-center sm:p-0 md:my-32">
            <DialogContent
              showCloseButton={false}
              className="relative transform overflow-hidden rounded-lg bg-surface-1 text-left shadow-raised-200 sm:my-8 sm:w-[40rem] static translate-x-0 translate-y-0 p-0 border-0"
            >
              <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <DialogTitle className="text-16 font-medium leading-6 text-primary">
                      Save this draft?
                    </DialogTitle>
                    <div className="mt-2">
                      <p className="text-13 text-secondary">
                        You can save this work item to Drafts so you can come back to it later.{" "}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-2 p-4 sm:px-6">
                <div>
                  <Button variant="secondary" onClick={onDiscard}>
                    Discard
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleDeletion} loading={isLoading}>
                    {isLoading ? "Saving" : "Save to Drafts"}
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

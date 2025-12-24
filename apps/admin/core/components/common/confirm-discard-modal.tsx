import React from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@plane/propel/primitives";
// ui
import { Button, getButtonStyling } from "@plane/propel/button";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  onDiscardHref: string;
};

export function ConfirmDiscardModal(props: Props) {
  const { isOpen, handleClose, onDiscardHref } = props;

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
              className="relative transform overflow-hidden rounded-lg bg-surface-1 text-left shadow-raised-200 sm:my-8 sm:w-[30rem] static translate-x-0 translate-y-0 p-0 border-0"
            >
              <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <DialogTitle className="text-16 font-medium leading-6 text-tertiary">
                      You have unsaved changes
                    </DialogTitle>
                    <div className="mt-2">
                      <p className="text-13 text-placeholder">
                        Changes you made will be lost if you go back. Do you wish to go back?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end items-center p-4 sm:px-6 gap-2">
                <Button variant="secondary" size="lg" onClick={handleClose}>
                  Keep editing
                </Button>
                <Link href={onDiscardHref} className={getButtonStyling("primary", "base")}>
                  Go back
                </Link>
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

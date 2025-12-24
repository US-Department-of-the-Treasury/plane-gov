"use client";

import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@plane/propel/primitives";
// constants
import { cn } from "../utils";
import { EModalPosition, EModalWidth } from "./constants";
// helpers

type Props = {
  children: React.ReactNode;
  handleClose?: () => void;
  isOpen: boolean;
  position?: EModalPosition;
  width?: EModalWidth;
  className?: string;
};

export function ModalCore(props: Props) {
  const {
    children,
    handleClose,
    isOpen,
    position = EModalPosition.CENTER,
    width = EModalWidth.XXL,
    className = "",
  } = props;

  const handleOpenChange = (open: boolean) => {
    if (!open && handleClose) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className={position}>
            <DialogContent
              showCloseButton={false}
              className={cn(
                "relative transform rounded-lg bg-surface-1 text-left shadow-raised-200 w-full",
                // Override DialogContent's default fixed positioning with static
                // since we're using flex centering from the parent wrapper
                "static translate-x-0 translate-y-0 p-0 border-0",
                width,
                className
              )}
            >
              {children}
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

import type { FC } from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
// ui
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { Calendar } from "@plane/propel/calendar";

export type InboxIssueSnoozeModalProps = {
  isOpen: boolean;
  value: Date | undefined;
  onConfirm: (value: Date) => void;
  handleClose: () => void;
};

export function InboxIssueSnoozeModal(props: InboxIssueSnoozeModalProps) {
  const { isOpen, handleClose, value, onConfirm } = props;
  // states
  const [date, setDate] = useState(value || new Date());
  //hooks
  const { t } = useTranslation();

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 flex w-full justify-center overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <DialogContent
              showCloseButton={false}
              className="relative flex transform rounded-lg bg-surface-1 px-5 py-8 text-left shadow-raised-200 sm:my-8 sm:w-full sm:max-w-2xl sm:p-6 static translate-x-0 translate-y-0 border-0"
            >
              <div className="flex h-full w-full flex-col gap-y-1">
                <Calendar
                  className="rounded-md border border-subtle p-3"
                  captionLayout="dropdown"
                  selected={date ? new Date(date) : undefined}
                  defaultMonth={date ? new Date(date) : undefined}
                  onSelect={(date: Date | undefined) => {
                    if (!date) return;
                    setDate(date);
                  }}
                  mode="single"
                  disabled={[
                    {
                      before: new Date(),
                    },
                  ]}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    handleClose();
                    onConfirm(date);
                  }}
                >
                  {t("inbox_issue.actions.snooze")}
                </Button>
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

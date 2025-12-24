import { Controller, useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
import { Button } from "@plane/propel/button";
import { Calendar } from "@plane/propel/calendar";

import { CloseIcon } from "@plane/propel/icons";
import { renderFormattedPayloadDate, renderFormattedDate, getDate } from "@plane/utils";
import { DateFilterSelect } from "./date-filter-select";
type Props = {
  title: string;
  handleClose: () => void;
  isOpen: boolean;
  onSelect: (val: string[]) => void;
};

type TFormValues = {
  filterType: "before" | "after" | "range";
  date1: Date;
  date2: Date;
};

const defaultValues: TFormValues = {
  filterType: "range",
  date1: new Date(),
  date2: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
};

export function DateFilterModal({ title, handleClose, isOpen, onSelect }: Props) {
  const { handleSubmit, watch, control } = useForm<TFormValues>({
    defaultValues,
  });

  const handleFormSubmit = (formData: TFormValues) => {
    const { filterType, date1, date2 } = formData;

    if (filterType === "range")
      onSelect([`${renderFormattedPayloadDate(date1)};after`, `${renderFormattedPayloadDate(date2)};before`]);
    else onSelect([`${renderFormattedPayloadDate(date1)};${filterType}`]);

    handleClose();
  };

  const date1 = getDate(watch("date1"));
  const date2 = getDate(watch("date1"));

  const isInvalid = watch("filterType") === "range" && date1 && date2 ? date1 > date2 : false;

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
                <form className="space-y-4">
                  <div className="flex w-full justify-between">
                    <Controller
                      control={control}
                      name="filterType"
                      render={({ field: { value, onChange } }) => (
                        <DateFilterSelect title={title} value={value} onChange={onChange} />
                      )}
                    />
                    <CloseIcon className="h-4 w-4 cursor-pointer" onClick={handleClose} />
                  </div>
                  <div className="flex w-full justify-between gap-4">
                    <Controller
                      control={control}
                      name="date1"
                      render={({ field: { value, onChange } }) => {
                        const dateValue = getDate(value);
                        const date2Value = getDate(watch("date2"));
                        return (
                          <Calendar
                            className="rounded-md border border-subtle p-3"
                            captionLayout="dropdown"
                            selected={dateValue}
                            defaultMonth={dateValue}
                            onSelect={(date: Date | undefined) => {
                              if (!date) return;
                              onChange(date);
                            }}
                            mode="single"
                            disabled={date2Value ? [{ after: date2Value }] : undefined}
                          />
                        );
                      }}
                    />
                    {watch("filterType") === "range" && (
                      <Controller
                        control={control}
                        name="date2"
                        render={({ field: { value, onChange } }) => {
                          const dateValue = getDate(value);
                          const date1Value = getDate(watch("date1"));
                          return (
                            <Calendar
                              className="rounded-md border border-subtle p-3"
                              captionLayout="dropdown"
                              selected={dateValue}
                              defaultMonth={dateValue}
                              onSelect={(date: Date | undefined) => {
                                if (!date) return;
                                onChange(date);
                              }}
                              mode="single"
                              disabled={date1Value ? [{ before: date1Value }] : undefined}
                            />
                          );
                        }}
                      />
                    )}
                  </div>
                  {watch("filterType") === "range" && (
                    <h6 className="flex items-center gap-1 text-11">
                      <span className="text-secondary">After:</span>
                      <span>{renderFormattedDate(watch("date1"))}</span>
                      <span className="ml-1 text-secondary">Before:</span>
                      {!isInvalid && <span>{renderFormattedDate(watch("date2"))}</span>}
                    </h6>
                  )}
                  <div className="flex justify-end gap-4">
                    <Button variant="secondary" size="lg" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      type="button"
                      onClick={handleSubmit(handleFormSubmit)}
                      disabled={isInvalid}
                    >
                      Apply
                    </Button>
                  </div>
              </form>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

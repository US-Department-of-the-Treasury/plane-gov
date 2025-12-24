import React, { useState } from "react";

import { useParams } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
// ui
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IUser, IImporterService } from "@plane/types";
import { Input } from "@plane/ui";
import { queryKeys } from "@/store/queries/query-keys";
import { IntegrationService } from "@/services/integrations/integration.service";
// ui
// icons
// types
// fetch-keys

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  data: IImporterService | null;
  user: IUser | null;
};

// services
const integrationService = new IntegrationService();

export function DeleteImportModal({ isOpen, handleClose, data }: Props) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDeleteImport, setConfirmDeleteImport] = useState(false);

  const { workspaceSlug } = useParams();
  const queryClient = useQueryClient();

  const handleDeletion = () => {
    if (!workspaceSlug || !data) return;

    setDeleteLoading(true);

    queryClient.setQueryData<IImporterService[]>(
      queryKeys.integrations.imports(workspaceSlug as string),
      (prevData) => (prevData ?? []).filter((i) => i.id !== data.id)
    );

    integrationService
      .deleteImporterService(workspaceSlug as string, data.service, data.id)
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Something went wrong. Please try again.",
        })
      )
      .finally(() => {
        setDeleteLoading(false);
        handleClose();
      });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  if (!data) return <></>;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-20 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogContent
              showCloseButton={false}
              className="relative transform overflow-hidden rounded-lg bg-surface-1 text-left shadow-raised-200 sm:my-8 sm:w-full sm:max-w-2xl static translate-x-0 translate-y-0 p-0 border-0"
            >
              <div className="flex flex-col gap-6 p-6">
                <div className="flex w-full items-center justify-start gap-6">
                  <span className="place-items-center rounded-full bg-red-500/20 p-4">
                    <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
                  </span>
                  <span className="flex items-center justify-start">
                    <h3 className="text-18 font-medium 2xl:text-20">Delete project</h3>
                  </span>
                </div>
                <span>
                  <p className="text-13 leading-7 text-secondary">
                    Are you sure you want to delete import from{" "}
                    <span className="break-words font-semibold capitalize text-primary">{data?.service}</span>? All of
                    the data related to the import will be permanently removed. This action cannot be undone.
                  </p>
                </span>
                <div>
                  <p className="text-13 text-secondary">
                    To confirm, type <span className="font-medium text-primary">delete import</span> below:
                  </p>
                  <Input
                    id="typeDelete"
                    type="text"
                    name="typeDelete"
                    onChange={(e) => {
                      if (e.target.value === "delete import") setConfirmDeleteImport(true);
                      else setConfirmDeleteImport(false);
                    }}
                    placeholder="Enter 'delete import'"
                    className="mt-2 w-full"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="lg" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="error-fill"
                    size="lg"
                    tabIndex={1}
                    onClick={handleDeletion}
                    disabled={!confirmDeleteImport}
                    loading={deleteLoading}
                  >
                    {deleteLoading ? "Deleting..." : "Delete Project"}
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

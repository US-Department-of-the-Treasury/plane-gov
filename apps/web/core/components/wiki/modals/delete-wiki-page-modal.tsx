"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { EModalPosition, EModalWidth, ModalCore, Input } from "@plane/ui";
// queries
import { useDeleteWikiPage } from "@/store/queries";

interface DeleteWikiPageModalProps {
  workspaceSlug: string;
  pageId: string;
  pageName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteWikiPageModal({
  workspaceSlug,
  pageId,
  pageName,
  isOpen,
  onClose,
  onSuccess,
}: DeleteWikiPageModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const deletePageMutation = useDeleteWikiPage();

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  const handleDelete = () => {
    deletePageMutation.mutate(
      {
        workspaceSlug,
        pageId,
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
      }
    );
  };

  const isConfirmed = confirmText.toLowerCase() === "delete";

  return (
    <ModalCore
      isOpen={isOpen}
      handleClose={handleClose}
      position={EModalPosition.TOP}
      width={EModalWidth.XXL}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="size-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium mb-2">Delete page</h3>
            <p className="text-sm text-custom-text-400 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-medium text-custom-text-200">
                &ldquo;{pageName || "Untitled"}&rdquo;
              </span>
              ? This action cannot be undone and all content will be permanently lost.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Type <span className="font-mono text-red-500">delete</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 p-5 border-t border-custom-border-200">
        <Button variant="secondary" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="error-fill"
          size="sm"
          onClick={handleDelete}
          loading={deletePageMutation.isPending}
          disabled={!isConfirmed}
        >
          Delete page
        </Button>
      </div>
    </ModalCore>
  );
}

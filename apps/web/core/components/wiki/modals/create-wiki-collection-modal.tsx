"use client";

import { useForm, Controller } from "react-hook-form";
// plane imports
import { Button } from "@plane/propel/button";
import { EModalPosition, EModalWidth, ModalCore, Input, TextArea } from "@plane/ui";
// queries
import { useCreateWikiCollection, useWikiCollections } from "@/store/queries";
// types
import type { TWikiCollectionFormData } from "@plane/types";

interface CreateWikiCollectionModalProps {
  workspaceSlug: string;
  isOpen: boolean;
  onClose: () => void;
  parentCollectionId?: string;
}

type FormData = {
  name: string;
  description?: string;
};

export function CreateWikiCollectionModal({
  workspaceSlug,
  isOpen,
  onClose,
  parentCollectionId,
}: CreateWikiCollectionModalProps) {
  const createCollectionMutation = useCreateWikiCollection();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    const payload: TWikiCollectionFormData = {
      name: data.name,
      description: data.description || "",
      icon: "folder",
      parent: parentCollectionId || null,
    };

    createCollectionMutation.mutate(
      {
        workspaceSlug,
        data: payload,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  return (
    <ModalCore
      isOpen={isOpen}
      handleClose={handleClose}
      position={EModalPosition.TOP}
      width={EModalWidth.XXL}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-5">
          <h3 className="text-lg font-medium mb-4">Create new collection</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Collection name <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Collection name is required" }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter collection name"
                    className="w-full"
                    hasError={!!errors.name}
                    autoFocus
                  />
                )}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description (optional)
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextArea
                    {...field}
                    placeholder="Brief description of the collection"
                    className="w-full resize-none"
                    rows={3}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-custom-border-200">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={isSubmitting || createCollectionMutation.isPending}
          >
            Create collection
          </Button>
        </div>
      </form>
    </ModalCore>
  );
}

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
// plane imports
import { Button } from "@plane/propel/button";
import { EModalPosition, EModalWidth, ModalCore, Input, TextArea } from "@plane/ui";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useCreateWikiPage, useWikiCollections } from "@/store/queries";
// types
import type { TWikiPageFormData } from "@plane/types";

interface CreateWikiPageModalProps {
  workspaceSlug: string;
  isOpen: boolean;
  onClose: () => void;
  parentPageId?: string;
  collectionId?: string;
}

type FormData = {
  name: string;
  description?: string;
  collection?: string | null;
};

export function CreateWikiPageModal({
  workspaceSlug,
  isOpen,
  onClose,
  parentPageId,
  collectionId,
}: CreateWikiPageModalProps) {
  const router = useAppRouter();
  const createPageMutation = useCreateWikiPage();
  const { data: collections } = useWikiCollections(workspaceSlug);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      collection: collectionId || null,
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    const payload: TWikiPageFormData = {
      name: data.name,
      description_html: data.description ? `<p>${data.description}</p>` : undefined,
      parent: parentPageId || null,
      collection: data.collection || null,
    };

    createPageMutation.mutate(
      {
        workspaceSlug,
        data: payload,
      },
      {
        onSuccess: (page) => {
          handleClose();
          router.push(`/${workspaceSlug}/wiki/${page.id}`);
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
          <h3 className="text-lg font-medium mb-4">Create new page</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Page title <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Page title is required" }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter page title"
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
                    placeholder="Brief description of the page"
                    className="w-full resize-none"
                    rows={3}
                  />
                )}
              />
            </div>

            {collections && collections.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Collection (optional)
                </label>
                <Controller
                  name="collection"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full px-3 py-2 text-sm border border-custom-border-200 rounded-md bg-custom-background-100 outline-none focus:border-custom-primary-100"
                    >
                      <option value="">No collection</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            )}
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
            loading={isSubmitting || createPageMutation.isPending}
          >
            Create page
          </Button>
        </div>
      </form>
    </ModalCore>
  );
}

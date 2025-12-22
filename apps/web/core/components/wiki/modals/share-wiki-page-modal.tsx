"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Copy, Trash2, Check, Link } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { EModalPosition, EModalWidth, ModalCore, Tooltip } from "@plane/ui";
// queries
import {
  useWikiPageShares,
  useCreateWikiPageShare,
  useDeleteWikiPageShare,
  useWorkspaceMembers,
} from "@/store/queries";
// types
import { EWikiSharePermission  } from "@plane/types";
import type {TWikiPageShareFormData} from "@plane/types";

interface ShareWikiPageModalProps {
  workspaceSlug: string;
  pageId: string;
  isOpen: boolean;
  onClose: () => void;
}

type FormData = {
  user: string;
  permission: EWikiSharePermission;
};

export function ShareWikiPageModal({
  workspaceSlug,
  pageId,
  isOpen,
  onClose,
}: ShareWikiPageModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  // Queries
  const { data: shares, isLoading: sharesLoading } = useWikiPageShares(workspaceSlug, pageId);
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  const createShareMutation = useCreateWikiPageShare();
  const deleteShareMutation = useDeleteWikiPageShare();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      user: "",
      permission: EWikiSharePermission.VIEW,
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    const payload: TWikiPageShareFormData = {
      user: data.user,
      permission: data.permission,
    };

    createShareMutation.mutate(
      {
        workspaceSlug,
        pageId,
        data: payload,
      },
      {
        onSuccess: () => {
          reset();
        },
      }
    );
  };

  const handleRemoveShare = (shareId: string) => {
    deleteShareMutation.mutate({
      workspaceSlug,
      pageId,
      shareId,
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/${workspaceSlug}/wiki/${pageId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filter out users who already have access
  const sharedUserIds = shares?.map((s) => s.user) || [];
  const availableMembers = members?.filter((m) => !sharedUserIds.includes(m.member.id)) || [];

  return (
    <ModalCore
      isOpen={isOpen}
      handleClose={handleClose}
      position={EModalPosition.TOP}
      width={EModalWidth.XXL}
    >
      <div className="p-5">
        <h3 className="text-lg font-medium mb-4">Share page</h3>

        {/* Copy link */}
        <div className="flex items-center gap-2 mb-6 p-3 bg-custom-background-80 rounded-lg">
          <Link className="size-4 text-custom-text-400" />
          <span className="text-sm flex-1 truncate">
            {typeof window !== "undefined"
              ? `${window.location.origin}/${workspaceSlug}/wiki/${pageId}`
              : `/${workspaceSlug}/wiki/${pageId}`}
          </span>
          <Tooltip tooltipContent={copiedLink ? "Copied!" : "Copy link"}>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-custom-background-90"
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* Add user form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Add people</label>
              <Controller
                name="user"
                control={control}
                rules={{ required: "Select a user" }}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 text-sm border border-custom-border-200 rounded-md bg-custom-background-100 outline-none focus:border-custom-primary-100"
                  >
                    <option value="">Select a member</option>
                    {availableMembers.map((member) => (
                      <option key={member.member.id} value={member.member.id}>
                        {member.member.display_name || member.member.email}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div className="w-32">
              <Controller
                name="permission"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-custom-border-200 rounded-md bg-custom-background-100 outline-none focus:border-custom-primary-100"
                  >
                    <option value={EWikiSharePermission.VIEW}>Viewer</option>
                    <option value={EWikiSharePermission.EDIT}>Editor</option>
                  </select>
                )}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={isSubmitting || createShareMutation.isPending}
              disabled={!availableMembers.length}
            >
              Add
            </Button>
          </div>
        </form>

        {/* Shared with list */}
        <div>
          <h4 className="text-sm font-medium mb-3">Shared with</h4>
          {sharesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-custom-primary-100" />
            </div>
          ) : shares && shares.length > 0 ? (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-custom-background-80"
                >
                  <div className="size-8 rounded-full bg-custom-background-80 flex items-center justify-center text-sm font-medium">
                    {share.user_detail?.display_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {share.user_detail?.display_name || share.user_detail?.email}
                    </p>
                    <p className="text-xs text-custom-text-400 capitalize">
                      {share.permission === EWikiSharePermission.EDIT ? "Editor" : "Viewer"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded hover:bg-custom-background-90 text-red-500"
                    onClick={() => handleRemoveShare(share.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-custom-text-400 text-center py-4">
              This page is not shared with anyone yet.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 p-5 border-t border-custom-border-200">
        <Button variant="secondary" size="sm" onClick={handleClose}>
          Done
        </Button>
      </div>
    </ModalCore>
  );
}

import React, { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
// plane imports
import type { EditorRefApi } from "@plane/editor";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { SitesFileService } from "@plane/services";
import type { TIssuePublicComment } from "@plane/types";
// editor components
import { LiteTextEditor } from "@/components/editor/lite-text-editor";
// store
import { useAddComment, usePublishSettings, useCurrentUser } from "@/store/queries";
import { usePeekStore } from "@/store/peek.store";
// services
const fileService = new SitesFileService();

const defaultValues: Partial<TIssuePublicComment> = {
  comment_html: "",
};

type Props = {
  anchor: string;
  disabled?: boolean;
};

export function AddComment(props: Props) {
  const { anchor } = props;
  // states
  const [uploadedAssetIds, setUploadAssetIds] = useState<string[]>([]);
  // refs
  const editorRef = useRef<EditorRefApi>(null);
  // store
  const { peekId: issueId } = usePeekStore();
  const { data: currentUser } = useCurrentUser();
  const { workspace: workspaceID } = usePublishSettings(anchor);
  const addCommentMutation = useAddComment();
  // form info
  const {
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting },
    reset,
  } = useForm<TIssuePublicComment>({ defaultValues });

  const onSubmit = async (formData: TIssuePublicComment) => {
    if (!anchor || !issueId || isSubmitting || !formData.comment_html) return;

    try {
      const res = await addCommentMutation.mutateAsync({
        anchor,
        issueId,
        data: { comment_html: formData.comment_html },
      });
      reset(defaultValues);
      editorRef.current?.clearEditor();
      if (uploadedAssetIds.length > 0) {
        await fileService.updateBulkAssetsUploadStatus(anchor, res.id, {
          asset_ids: uploadedAssetIds,
        });
        setUploadAssetIds([]);
      }
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Comment could not be posted. Please try again.",
      });
    }
  };

  // TODO: on click if he user is not logged in redirect to login page
  return (
    <div>
      <div className="issue-comments-section">
        <Controller
          name="comment_html"
          control={control}
          render={({ field: { value, onChange } }) => (
            <LiteTextEditor
              editable
              onEnterKeyPress={(e) => {
                if (currentUser) handleSubmit(onSubmit)(e);
              }}
              anchor={anchor}
              workspaceId={workspaceID?.toString() ?? ""}
              ref={editorRef}
              id="peek-overview-add-comment"
              initialValue={
                !value || value === "" || (typeof value === "object" && Object.keys(value).length === 0)
                  ? watch("comment_html")
                  : value
              }
              onChange={(comment_json, comment_html) => onChange(comment_html)}
              isSubmitting={isSubmitting}
              placeholder="Add comment..."
              uploadFile={async (blockId, file) => {
                const res = await fileService.uploadAsset(
                  anchor,
                  { entity_identifier: "", entity_type: "COMMENT_DESCRIPTION" as const },
                  file
                );
                setUploadAssetIds((prev) => [...prev, res.asset_id]);
                return res.asset_id;
              }}
              displayConfig={{
                fontSize: "small-font",
              }}
            />
          )}
        />
      </div>
    </div>
  );
}

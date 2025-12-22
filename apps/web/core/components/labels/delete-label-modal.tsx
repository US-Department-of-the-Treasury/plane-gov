import React from "react";
import { useParams } from "next/navigation";
// types
import { PROJECT_SETTINGS_TRACKER_EVENTS } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IIssueLabel } from "@plane/types";
// ui
import { AlertModalCore } from "@plane/ui";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useDeleteLabel } from "@/store/queries/label";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: IIssueLabel | null;
};

export function DeleteLabelModal(props: Props) {
  const { isOpen, onClose, data } = props;
  // router
  const { workspaceSlug, projectId } = useParams();
  // store hooks
  const { mutateAsync: deleteLabel, isPending: isDeleteLoading } = useDeleteLabel();

  const handleClose = () => {
    onClose();
  };

  const handleDeletion = async () => {
    if (!workspaceSlug || !projectId || !data) return;

    await deleteLabel({
      workspaceSlug: workspaceSlug.toString(),
      projectId: projectId.toString(),
      labelId: data.id,
    })
      .then(() => {
        captureSuccess({
          eventName: PROJECT_SETTINGS_TRACKER_EVENTS.label_deleted,
          payload: {
            name: data.name,
            project_id: projectId,
          },
        });
        handleClose();
      })
      .catch((err) => {
        captureError({
          eventName: PROJECT_SETTINGS_TRACKER_EVENTS.label_deleted,
          payload: {
            name: data.name,
            project_id: projectId,
          },
          error: err,
        });

        const error = err?.error || "Label could not be deleted. Please try again.";
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: error,
        });
      });
  };

  return (
    <AlertModalCore
      handleClose={handleClose}
      handleSubmit={handleDeletion}
      isSubmitting={isDeleteLoading}
      isOpen={isOpen}
      title="Delete Label"
      content={
        <>
          Are you sure you want to delete <span className="font-medium text-primary">{data?.name}</span>? This will
          remove the label from all the work item and from any views where the label is being filtered upon.
        </>
      }
    />
  );
}

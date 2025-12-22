import React from "react";
import { useParams } from "next/navigation";
// types
import { STATE_TRACKER_EVENTS } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IState } from "@plane/types";
// ui
import { AlertModalCore } from "@plane/ui";
// constants
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useDeleteState } from "@/store/queries/state";

type TStateDeleteModal = {
  isOpen: boolean;
  onClose: () => void;
  data: IState | null;
};

export const StateDeleteModal = function StateDeleteModal(props: TStateDeleteModal) {
  const { isOpen, onClose, data } = props;
  // router
  const { workspaceSlug } = useParams();
  const { mutate: deleteState, isPending: isDeleteLoading } = useDeleteState();

  const handleClose = () => {
    onClose();
  };

  const handleDeletion = () => {
    if (!workspaceSlug || !data) return;

    deleteState(
      {
        workspaceSlug: workspaceSlug.toString(),
        projectId: data.project_id,
        stateId: data.id,
      },
      {
        onSuccess: () => {
          captureSuccess({
            eventName: STATE_TRACKER_EVENTS.delete,
            payload: {
              id: data.id,
            },
          });
          handleClose();
        },
        onError: (err: any) => {
          if (err.status === 400)
            setToast({
              type: TOAST_TYPE.ERROR,
              title: "Error!",
              message:
                "This state contains some work items within it, please move them to some other state to delete this state.",
            });
          else
            setToast({
              type: TOAST_TYPE.ERROR,
              title: "Error!",
              message: "State could not be deleted. Please try again.",
            });
          captureError({
            eventName: STATE_TRACKER_EVENTS.delete,
            payload: {
              id: data.id,
            },
          });
        },
      }
    );
  };

  return (
    <AlertModalCore
      handleClose={handleClose}
      handleSubmit={handleDeletion}
      isSubmitting={isDeleteLoading}
      isOpen={isOpen}
      title="Delete State"
      content={
        <>
          Are you sure you want to delete state- <span className="font-medium text-primary">{data?.name}</span>? All of
          the data related to the state will be permanently removed. This action cannot be undone.
        </>
      }
    />
  );
};

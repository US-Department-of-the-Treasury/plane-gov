import React, { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// types
import { EPIC_TRACKER_EVENTS, PROJECT_ERROR_MESSAGES } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IEpic } from "@plane/types";
// ui
import { AlertModalCore } from "@plane/ui";
// constants
// helpers
import { captureSuccess, captureError } from "@/helpers/event-tracker.helper";
// hooks
import { useEpic } from "@/hooks/store/use-epic";
import { useAppRouter } from "@/hooks/use-app-router";

type Props = {
  data: IEpic;
  isOpen: boolean;
  onClose: () => void;
};

export const DeleteEpicModal = observer(function DeleteEpicModal(props: Props) {
  const { data, isOpen, onClose } = props;
  // states
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId, epicId, peekModule } = useParams();
  // store hooks
  const { deleteEpic } = useEpic();
  const { t } = useTranslation();

  const handleClose = () => {
    onClose();
    setIsDeleteLoading(false);
  };

  const handleDeletion = async () => {
    if (!workspaceSlug || !projectId) return;

    setIsDeleteLoading(true);

    await deleteEpic(workspaceSlug.toString(), projectId.toString(), data.id)
      .then(() => {
        if (epicId || peekModule) router.push(`/${workspaceSlug}/projects/${data.project_id}/modules`);
        handleClose();
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Module deleted successfully.",
        });
        captureSuccess({
          eventName: EPIC_TRACKER_EVENTS.delete,
          payload: { id: data.id },
        });
      })
      .catch((errors) => {
        const isPermissionError = errors?.error === "You don't have the required permissions.";
        const currentError = isPermissionError
          ? PROJECT_ERROR_MESSAGES.permissionError
          : PROJECT_ERROR_MESSAGES.moduleDeleteError;
        setToast({
          title: t(currentError.i18n_title),
          type: TOAST_TYPE.ERROR,
          message: currentError.i18n_message && t(currentError.i18n_message),
        });
        captureError({
          eventName: EPIC_TRACKER_EVENTS.delete,
          payload: { id: data.id },
          error: errors,
        });
      })
      .finally(() => handleClose());
  };

  return (
    <AlertModalCore
      handleClose={handleClose}
      handleSubmit={handleDeletion}
      isSubmitting={isDeleteLoading}
      isOpen={isOpen}
      title="Delete module"
      content={
        <>
          Are you sure you want to delete module-{" "}
          <span className="break-all font-medium text-primary">{data?.name}</span>? All of the data related to the
          module will be permanently removed. This action cannot be undone.
        </>
      }
    />
  );
});

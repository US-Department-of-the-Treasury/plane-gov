import { useState } from "react";
import { observer } from "mobx-react";
import { useParams, useSearchParams } from "next/navigation";
// types
import { PROJECT_ERROR_MESSAGES, SPRINT_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { ISprint } from "@plane/types";
// ui
import { AlertModalCore } from "@plane/ui";
// helpers
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useAppRouter } from "@/hooks/use-app-router";

interface ISprintDelete {
  sprint: ISprint;
  isOpen: boolean;
  handleClose: () => void;
  workspaceSlug: string;
  projectId: string;
}

export const SprintDeleteModal = observer(function SprintDeleteModal(props: ISprintDelete) {
  const { isOpen, handleClose, sprint, workspaceSlug, projectId } = props;
  // states
  const [loader, setLoader] = useState(false);
  // store hooks
  const { deleteSprint } = useSprint();
  const { t } = useTranslation();
  // router
  const router = useAppRouter();
  const { sprintId } = useParams();
  const searchParams = useSearchParams();
  const peekSprint = searchParams.get("peekSprint");

  const formSubmit = async () => {
    if (!sprint) return;

    setLoader(true);
    try {
      await deleteSprint(workspaceSlug, projectId, sprint.id)
        .then(() => {
          if (sprintId || peekSprint) router.push(`/${workspaceSlug}/projects/${projectId}/sprints`);
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: "Success!",
            message: "Sprint deleted successfully.",
          });
          captureSuccess({
            eventName: SPRINT_TRACKER_EVENTS.delete,
            payload: {
              id: sprint.id,
            },
          });
        })
        .catch((errors) => {
          const isPermissionError = errors?.error === "You don't have the required permissions.";
          const currentError = isPermissionError
            ? PROJECT_ERROR_MESSAGES.permissionError
            : PROJECT_ERROR_MESSAGES.sprintDeleteError;
          setToast({
            title: t(currentError.i18n_title),
            type: TOAST_TYPE.ERROR,
            message: currentError.i18n_message && t(currentError.i18n_message),
          });
          captureError({
            eventName: SPRINT_TRACKER_EVENTS.delete,
            payload: {
              id: sprint.id,
            },
            error: errors,
          });
        })
        .finally(() => handleClose());
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Warning!",
        message: "Something went wrong please try again later.",
      });
    }

    setLoader(false);
  };

  return (
    <AlertModalCore
      handleClose={handleClose}
      handleSubmit={formSubmit}
      isSubmitting={loader}
      isOpen={isOpen}
      title="Delete sprint"
      content={
        <>
          Are you sure you want to delete sprint{' "'}
          <span className="break-words font-medium text-primary">{sprint?.name}</span>
          {'"'}? All of the data related to the sprint will be permanently removed. This action cannot be undone.
        </>
      }
    />
  );
});

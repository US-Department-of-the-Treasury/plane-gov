import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
// types
import { EPIC_TRACKER_EVENTS } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IEpic } from "@plane/types";
// ui
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
// components
import { EpicForm } from "@/components/epics";
// constants
// helpers
import { captureSuccess, captureError } from "@/helpers/event-tracker.helper";
// hooks
import useKeypress from "@/hooks/use-keypress";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useProjects, getJoinedProjectIds } from "@/store/queries/project";
import { useCreateEpic, useUpdateEpic } from "@/store/queries/epic";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data?: IEpic;
  workspaceSlug: string;
  projectId: string;
};

const defaultValues: Partial<IEpic> = {
  name: "",
  description: "",
  status: "backlog",
  lead_id: null,
  member_ids: [],
};

export function CreateUpdateEpicModal(props: Props) {
  const { isOpen, onClose, data, workspaceSlug, projectId } = props;
  // states
  const [activeProject, setActiveProject] = useState<string | null>(null);
  // store hooks
  const { isMobile } = usePlatformOS();
  // query hooks
  const { data: projects } = useProjects(workspaceSlug);
  // mutation hooks
  const { mutateAsync: createEpicMutation } = useCreateEpic();
  const { mutateAsync: updateEpicMutation } = useUpdateEpic();
  // derived values
  const workspaceProjectIds = getJoinedProjectIds(projects);

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const { reset } = useForm<IEpic>({
    defaultValues,
  });

  const handleCreateEpic = async (payload: Partial<IEpic>) => {
    if (!workspaceSlug || !projectId) return;

    const selectedProjectId = payload.project_id ?? projectId.toString();
    await createEpicMutation({
      workspaceSlug: workspaceSlug.toString(),
      projectId: selectedProjectId,
      data: payload,
    })
      .then((res) => {
        handleClose();
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Epic created successfully.",
        });
        captureSuccess({
          eventName: EPIC_TRACKER_EVENTS.create,
          payload: { id: res.id },
        });
      })
      .catch((err) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.detail ?? err?.error ?? "Epic could not be created. Please try again.",
        });
        captureError({
          eventName: EPIC_TRACKER_EVENTS.create,
          payload: { id: data?.id },
          error: err,
        });
      });
  };

  const handleUpdateEpic = async (payload: Partial<IEpic>) => {
    if (!workspaceSlug || !projectId || !data) return;

    const selectedProjectId = payload.project_id ?? projectId.toString();
    await updateEpicMutation({
      workspaceSlug: workspaceSlug.toString(),
      projectId: selectedProjectId,
      epicId: data.id,
      data: payload,
    })
      .then((res) => {
        handleClose();

        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Epic updated successfully.",
        });
        captureSuccess({
          eventName: EPIC_TRACKER_EVENTS.update,
          payload: { id: res.id },
        });
      })
      .catch((err) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.detail ?? err?.error ?? "Epic could not be updated. Please try again.",
        });
        captureError({
          eventName: EPIC_TRACKER_EVENTS.update,
          payload: { id: data.id },
          error: err,
        });
      });
  };

  const handleFormSubmit = async (formData: Partial<IEpic>) => {
    if (!workspaceSlug || !projectId) return;

    const payload: Partial<IEpic> = {
      ...formData,
    };
    if (!data) await handleCreateEpic(payload);
    else await handleUpdateEpic(payload);
  };

  useEffect(() => {
    // if modal is closed, reset active project to null
    // and return to avoid activeProject being set to some other project
    if (!isOpen) {
      setActiveProject(null);
      return;
    }

    // if data is present, set active project to the project of the
    // issue. This has more priority than the project in the url.
    if (data && data.project_id) {
      setActiveProject(data.project_id);
      return;
    }

    // if data is not present, set active project to the project
    // in the url. This has the least priority.
    if (workspaceProjectIds && workspaceProjectIds.length > 0 && !activeProject)
      setActiveProject(projectId ?? workspaceProjectIds?.[0] ?? null);
  }, [activeProject, data, projectId, workspaceProjectIds, isOpen]);

  useKeypress("Escape", () => {
    if (isOpen) handleClose();
  });

  return (
    <ModalCore isOpen={isOpen} position={EModalPosition.TOP} width={EModalWidth.XXL}>
      <EpicForm
        handleFormSubmit={handleFormSubmit}
        handleClose={handleClose}
        status={data ? true : false}
        projectId={activeProject ?? ""}
        setActiveProject={setActiveProject}
        data={data}
        isMobile={isMobile}
      />
    </ModalCore>
  );
}

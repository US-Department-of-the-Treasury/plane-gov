import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useForm } from "react-hook-form";
// types
import { MODULE_TRACKER_EVENTS } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IModule } from "@plane/types";
// ui
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
// components
import { ModuleForm } from "@/components/modules";
// constants
// helpers
import { captureSuccess, captureError } from "@/helpers/event-tracker.helper";
// hooks
import useKeypress from "@/hooks/use-keypress";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useCreateModule, useUpdateModule } from "@/store/queries/module";
import { useProjects, getJoinedProjectIds } from "@/store/queries/project";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data?: IModule;
  workspaceSlug: string;
  projectId: string;
};

const defaultValues: Partial<IModule> = {
  name: "",
  description: "",
  status: "backlog",
  lead_id: null,
  member_ids: [],
};

export const CreateUpdateModuleModal = observer(function CreateUpdateModuleModal(props: Props) {
  const { isOpen, onClose, data, workspaceSlug, projectId } = props;
  // states
  const [activeProject, setActiveProject] = useState<string | null>(null);
  // store hooks
  const createModuleMutation = useCreateModule();
  const updateModuleMutation = useUpdateModule();
  const { isMobile } = usePlatformOS();
  // query hooks
  const { data: projects } = useProjects(workspaceSlug);
  // derived values
  const workspaceProjectIds = getJoinedProjectIds(projects);

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const { reset } = useForm<IModule>({
    defaultValues,
  });

  const handleCreateModule = async (payload: Partial<IModule>) => {
    if (!workspaceSlug || !projectId) return;

    const selectedProjectId = payload.project_id ?? projectId.toString();
    await createModuleMutation
      .mutateAsync({
        workspaceSlug: workspaceSlug.toString(),
        projectId: selectedProjectId,
        data: payload,
      })
      .then((res) => {
        handleClose();
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Module created successfully.",
        });
        captureSuccess({
          eventName: MODULE_TRACKER_EVENTS.create,
          payload: { id: res.id },
        });
      })
      .catch((err) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.detail ?? err?.error ?? "Module could not be created. Please try again.",
        });
        captureError({
          eventName: MODULE_TRACKER_EVENTS.create,
          payload: { id: data?.id },
          error: err,
        });
      });
  };

  const handleUpdateModule = async (payload: Partial<IModule>) => {
    if (!workspaceSlug || !projectId || !data) return;

    const selectedProjectId = payload.project_id ?? projectId.toString();
    await updateModuleMutation
      .mutateAsync({
        workspaceSlug: workspaceSlug.toString(),
        projectId: selectedProjectId,
        moduleId: data.id,
        data: payload,
      })
      .then((res) => {
        handleClose();

        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Module updated successfully.",
        });
        captureSuccess({
          eventName: MODULE_TRACKER_EVENTS.update,
          payload: { id: res.id },
        });
      })
      .catch((err) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.detail ?? err?.error ?? "Module could not be updated. Please try again.",
        });
        captureError({
          eventName: MODULE_TRACKER_EVENTS.update,
          payload: { id: data.id },
          error: err,
        });
      });
  };

  const handleFormSubmit = async (formData: Partial<IModule>) => {
    if (!workspaceSlug || !projectId) return;

    const payload: Partial<IModule> = {
      ...formData,
    };
    if (!data) await handleCreateModule(payload);
    else await handleUpdateModule(payload);
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
      <ModuleForm
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
});

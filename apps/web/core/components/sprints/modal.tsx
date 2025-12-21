import React, { useEffect, useState } from "react";
import { mutate } from "swr";
// types
import { CYCLE_TRACKER_EVENTS } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { SprintDateCheckData, ISprint, TSprintTabOptions } from "@plane/types";
// ui
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
// hooks
import { renderFormattedPayloadDate } from "@plane/utils";
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useSprint } from "@/hooks/store/use-sprint";
import { useProject } from "@/hooks/store/use-project";
import useKeypress from "@/hooks/use-keypress";
import useLocalStorage from "@/hooks/use-local-storage";
import { usePlatformOS } from "@/hooks/use-platform-os";
// services
import { SprintService } from "@/services/sprint.service";
// local imports
import { SprintForm } from "./form";

type SprintModalProps = {
  isOpen: boolean;
  handleClose: () => void;
  data?: ISprint | null;
  workspaceSlug: string;
  projectId: string;
};

// services
const sprintService = new SprintService();

export function SprintCreateUpdateModal(props: SprintModalProps) {
  const { isOpen, handleClose, data, workspaceSlug, projectId } = props;
  // states
  const [activeProject, setActiveProject] = useState<string | null>(null);
  // store hooks
  const { workspaceProjectIds } = useProject();
  const { createSprint, updateSprintDetails } = useSprint();
  const { isMobile } = usePlatformOS();

  const { setValue: setSprintTab } = useLocalStorage<TSprintTabOptions>("sprint_tab", "active");

  const handleCreateSprint = async (payload: Partial<ISprint>) => {
    if (!workspaceSlug || !projectId) return;

    const selectedProjectId = payload.project_id ?? projectId.toString();
    await createSprint(workspaceSlug, selectedProjectId, payload)
      .then((res) => {
        // mutate when the current sprint creation is active
        if (payload.start_date && payload.end_date) {
          const currentDate = new Date();
          const sprintStartDate = new Date(payload.start_date);
          const sprintEndDate = new Date(payload.end_date);
          if (currentDate >= sprintStartDate && currentDate <= sprintEndDate) {
            mutate(`PROJECT_ACTIVE_CYCLE_${selectedProjectId}`);
          }
        }

        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Sprint created successfully.",
        });
        captureSuccess({
          eventName: CYCLE_TRACKER_EVENTS.create,
          payload: {
            id: res.id,
          },
        });
      })
      .catch((err) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.detail ?? "Error in creating sprint. Please try again.",
        });
        captureError({
          eventName: CYCLE_TRACKER_EVENTS.create,
          error: err,
        });
      });
  };

  const handleUpdateSprint = async (sprintId: string, payload: Partial<ISprint>) => {
    if (!workspaceSlug || !projectId) return;

    const selectedProjectId = payload.project_id ?? projectId.toString();
    await updateSprintDetails(workspaceSlug, selectedProjectId, sprintId, payload)
      .then((res) => {
        captureSuccess({
          eventName: CYCLE_TRACKER_EVENTS.update,
          payload: {
            id: res.id,
          },
        });
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Sprint updated successfully.",
        });
      })
      .catch((err) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.detail ?? "Error in updating sprint. Please try again.",
        });
        captureError({
          eventName: CYCLE_TRACKER_EVENTS.update,
          error: err,
        });
      });
  };

  const dateChecker = async (projectId: string, payload: SprintDateCheckData) => {
    let status = false;

    await sprintService.sprintDateCheck(workspaceSlug, projectId, payload).then((res) => {
      status = res.status;
    });

    return status;
  };

  const handleFormSubmit = async (formData: Partial<ISprint>) => {
    if (!workspaceSlug || !projectId) return;

    const payload: Partial<ISprint> = {
      ...formData,
      start_date: renderFormattedPayloadDate(formData.start_date) ?? null,
      end_date: renderFormattedPayloadDate(formData.end_date) ?? null,
    };

    let isDateValid: boolean = true;

    if (payload.start_date && payload.end_date) {
      if (data?.id) {
        // Update existing sprint - only check dates if they've changed
        const originalStartDate = renderFormattedPayloadDate(data.start_date) ?? null;
        const originalEndDate = renderFormattedPayloadDate(data.end_date) ?? null;
        const hasDateChanged = payload.start_date !== originalStartDate || payload.end_date !== originalEndDate;

        if (hasDateChanged) {
          isDateValid = await dateChecker(projectId, {
            start_date: payload.start_date,
            end_date: payload.end_date,
            sprint_id: data.id,
          });
        }
      } else {
        // Create new sprint - always check dates
        isDateValid = await dateChecker(projectId, {
          start_date: payload.start_date,
          end_date: payload.end_date,
        });
      }
    }

    if (isDateValid) {
      if (data?.id) await handleUpdateSprint(data.id, payload);
      else {
        await handleCreateSprint(payload).then(() => {
          setSprintTab("all");
        });
      }
      handleClose();
    } else
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "You already have a sprint on the given dates, if you want to create a draft sprint, remove the dates.",
      });
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
      <SprintForm
        handleFormSubmit={handleFormSubmit}
        handleClose={handleClose}
        status={!!data}
        projectId={activeProject ?? ""}
        setActiveProject={setActiveProject}
        data={data}
        isMobile={isMobile}
      />
    </ModalCore>
  );
}

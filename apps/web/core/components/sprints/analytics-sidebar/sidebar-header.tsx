import type { FC } from "react";
import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
// Plane Imports
import {
  SPRINT_TRACKER_EVENTS,
  SPRINT_STATUS,
  EUserPermissions,
  EUserPermissionsLevel,
  SPRINT_TRACKER_ELEMENTS,
} from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ChevronRightIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { ISprint } from "@plane/types";
import { getDate, renderFormattedPayloadDate } from "@plane/utils";
// components
import { DateRangeDropdown } from "@/components/dropdowns/date-range";
// hooks
import { captureElementAndEvent } from "@/helpers/event-tracker.helper";
import { useSprint } from "@/hooks/store/use-sprint";
import { useUserPermissions } from "@/hooks/store/user";
import { useTimeZoneConverter } from "@/hooks/use-timezone-converter";
// services
import { SprintService } from "@/services/sprint.service";

type Props = {
  workspaceSlug: string;
  projectId: string;
  sprintDetails: ISprint;
  handleClose: () => void;
  isArchived?: boolean;
};

const defaultValues: Partial<ISprint> = {
  start_date: null,
  end_date: null,
};

const sprintService = new SprintService();

export const SprintSidebarHeader = observer(function SprintSidebarHeader(props: Props) {
  const { workspaceSlug, projectId, sprintDetails, handleClose, isArchived = false } = props;
  // hooks
  const { allowPermissions } = useUserPermissions();
  const { updateSprintDetails } = useSprint();
  const { t } = useTranslation();
  const { renderFormattedDateInUserTimezone, getProjectUTCOffset } = useTimeZoneConverter(projectId);

  // derived values
  const projectUTCOffset = getProjectUTCOffset();

  // form info
  const { control, reset } = useForm({
    defaultValues,
  });

  const sprintStatus = sprintDetails?.status?.toLocaleLowerCase();
  const isCompleted = sprintStatus === "completed";

  const currentSprint = SPRINT_STATUS.find((status) => status.value === sprintStatus);

  const submitChanges = async (data: Partial<ISprint>) => {
    if (!workspaceSlug || !projectId || !sprintDetails.id) return;

    await updateSprintDetails(workspaceSlug.toString(), projectId.toString(), sprintDetails.id.toString(), data)
      .then(() => {
        captureElementAndEvent({
          element: {
            elementName: SPRINT_TRACKER_ELEMENTS.RIGHT_SIDEBAR,
          },
          event: {
            eventName: SPRINT_TRACKER_EVENTS.update,
            state: "SUCCESS",
            payload: {
              id: sprintDetails.id,
            },
          },
        });
      })

      .catch(() => {
        captureElementAndEvent({
          element: {
            elementName: SPRINT_TRACKER_ELEMENTS.RIGHT_SIDEBAR,
          },
          event: {
            eventName: SPRINT_TRACKER_EVENTS.update,
            state: "ERROR",
            payload: {
              id: sprintDetails.id,
            },
          },
        });
      });
  };

  useEffect(() => {
    if (sprintDetails)
      reset({
        ...sprintDetails,
      });
  }, [sprintDetails, reset]);

  const dateChecker = async (payload: any) => {
    try {
      const res = await sprintService.sprintDateCheck(workspaceSlug, projectId, payload);
      return res.status;
    } catch (err) {
      return false;
    }
  };

  const handleDateChange = async (startDate: Date | undefined, endDate: Date | undefined) => {
    let isDateValid = false;

    const payload = {
      start_date: renderFormattedPayloadDate(startDate) || null,
      end_date: renderFormattedPayloadDate(endDate) || null,
    };

    if (payload?.start_date && payload.end_date) {
      isDateValid = await dateChecker({
        ...payload,
        sprint_id: sprintDetails.id,
      });
    } else {
      isDateValid = true;
    }
    if (isDateValid) {
      submitChanges(payload);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("project_sprints.action.update.success.title"),
        message: t("project_sprints.action.update.success.description"),
      });
    } else {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("project_sprints.action.update.failed.title"),
        message: t("project_sprints.action.update.error.already_exists"),
      });
    }
    return isDateValid;
  };

  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  return (
    <>
      <div className="sticky z-10 top-0 pt-2 flex items-center justify-between bg-surface-1">
        <div className="flex items-center justify-center size-5">
          <button
            className="flex size-6 items-center justify-center rounded-full bg-layer-3 hover:bg-layer-3-hover flex-shrink-0"
            onClick={() => handleClose()}
          >
            <ChevronRightIcon className="size-4 stroke-2 text-secondary" />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-start justify-between gap-3 pt-2">
          <h4 className="w-full break-words text-18 font-semibold text-primary">{sprintDetails.name}</h4>
          {currentSprint && (
            <span
              className="flex h-6 min-w-20 px-3 items-center justify-center rounded-sm text-center text-11 font-medium whitespace-nowrap truncate"
              style={{
                color: currentSprint.color,
                backgroundColor: `${currentSprint.color}20`,
              }}
            >
              {t(currentSprint.i18n_title)}
            </span>
          )}
        </div>

        <Controller
          control={control}
          name="start_date"
          render={({ field: { value: startDateValue, onChange: onChangeStartDate } }) => (
            <div className="flex gap-2 items-center">
              <Controller
                control={control}
                name="end_date"
                render={({ field: { value: endDateValue, onChange: onChangeEndDate } }) => (
                  <DateRangeDropdown
                    className="h-7"
                    buttonVariant="border-with-text"
                    minDate={new Date()}
                    value={{
                      from: getDate(startDateValue),
                      to: getDate(endDateValue),
                    }}
                    onSelect={async (val) => {
                      const isDateValid = await handleDateChange(val?.from, val?.to);
                      if (isDateValid) {
                        onChangeStartDate(val?.from ? renderFormattedPayloadDate(val.from) : null);
                        onChangeEndDate(val?.to ? renderFormattedPayloadDate(val.to) : null);
                      }
                    }}
                    placeholder={{
                      from: t("project_sprints.start_date"),
                      to: t("project_sprints.end_date"),
                    }}
                    customTooltipHeading={t("project_sprints.in_your_timezone")}
                    customTooltipContent={
                      <span className="flex gap-1">
                        {renderFormattedDateInUserTimezone(sprintDetails.start_date ?? "")}
                        <ArrowRight className="h-3 w-3 flex-shrink-0 my-auto" />
                        {renderFormattedDateInUserTimezone(sprintDetails.end_date ?? "")}
                      </span>
                    }
                    mergeDates
                    showTooltip={!!sprintDetails.start_date && !!sprintDetails.end_date} // show tooltip only if both start and end date are present
                    required={sprintDetails.status !== "draft"}
                    disabled={!isEditingAllowed || isArchived || isCompleted}
                  />
                )}
              />
              {projectUTCOffset && (
                <span className="rounded-md text-11 px-2 cursor-default  py-1 bg-layer-1 text-tertiary">
                  {projectUTCOffset}
                </span>
              )}
            </div>
          )}
        />
      </div>
    </>
  );
});

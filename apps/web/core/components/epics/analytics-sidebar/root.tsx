import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Info, Plus, SquareUser } from "lucide-react";
import { Disclosure, Transition } from "@headlessui/react";
import {
  EPIC_STATUS,
  EUserPermissions,
  EUserPermissionsLevel,
  EEstimateSystem,
  EPIC_TRACKER_EVENTS,
  MODULE_TRACKER_ELEMENTS,
} from "@plane/constants";
// plane types
import { useTranslation } from "@plane/i18n";
import {
  MembersPropertyIcon,
  ModuleStatusIcon,
  WorkItemsIcon,
  StartDatePropertyIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { ILinkDetails, IEpic, EpicLink } from "@plane/types";
// plane ui
import { Loader, CustomSelect, TextArea } from "@plane/ui";
// components
// helpers
import { getDate, renderFormattedPayloadDate } from "@plane/utils";
import { DateRangeDropdown } from "@/components/dropdowns/date-range";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { CreateUpdateModuleLinkModal, ModuleAnalyticsProgress, ModuleLinksList } from "@/components/epics";
import { captureElementAndEvent, captureSuccess, captureError } from "@/helpers/event-tracker.helper";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useEpic } from "@/hooks/store/use-epic";
import { useUserPermissions } from "@/hooks/store/user";
// plane web constants
const defaultValues: Partial<IEpic> = {
  lead_id: "",
  member_ids: [],
  start_date: null,
  target_date: null,
  status: "backlog",
};

type Props = {
  epicId: string;
  handleClose: () => void;
  isArchived?: boolean;
};

// TODO: refactor this component
export const EpicAnalyticsSidebar = observer(function EpicAnalyticsSidebar(props: Props) {
  const { epicId, handleClose, isArchived } = props;
  // states
  const [moduleLinkModal, setModuleLinkModal] = useState(false);
  const [selectedLinkToUpdate, setSelectedLinkToUpdate] = useState<ILinkDetails | null>(null);
  // router
  const { workspaceSlug, projectId } = useParams();

  // store hooks
  const { t } = useTranslation();
  const { allowPermissions } = useUserPermissions();

  const { getEpicById, updateEpicDetails, createEpicLink, updateEpicLink, deleteEpicLink } = useEpic();
  const { areEstimateEnabledByProjectId, currentActiveEstimateId, estimateById } = useProjectEstimates();

  // derived values
  const epicDetails = getEpicById(epicId);
  const areEstimateEnabled = projectId && areEstimateEnabledByProjectId(projectId.toString());
  const estimateType = areEstimateEnabled && currentActiveEstimateId && estimateById(currentActiveEstimateId);
  const isEstimatePointValid = estimateType && estimateType?.type == EEstimateSystem.POINTS ? true : false;

  const { reset, control } = useForm({
    defaultValues,
  });

  const submitChanges = (data: Partial<IEpic>) => {
    if (!workspaceSlug || !projectId || !epicId) return;
    updateEpicDetails(workspaceSlug.toString(), projectId.toString(), epicId.toString(), data)
      .then((res) => {
        captureElementAndEvent({
          element: {
            elementName: MODULE_TRACKER_ELEMENTS.RIGHT_SIDEBAR,
          },
          event: {
            eventName: EPIC_TRACKER_EVENTS.update,
            payload: { id: res.id },
            state: "SUCCESS",
          },
        });
      })
      .catch((error) => {
        captureError({
          eventName: EPIC_TRACKER_EVENTS.update,
          payload: { id: epicId },
          error,
        });
      });
  };

  const handleCreateLink = async (formData: EpicLink) => {
    if (!workspaceSlug || !projectId || !epicId) return;

    const payload = { metadata: {}, ...formData };

    await createEpicLink(workspaceSlug.toString(), projectId.toString(), epicId.toString(), payload)
      .then(() =>
        captureSuccess({
          eventName: EPIC_TRACKER_EVENTS.link.create,
          payload: { id: epicId },
        })
      )
      .catch((error) => {
        captureError({
          eventName: EPIC_TRACKER_EVENTS.link.create,
          payload: { id: epicId },
          error,
        });
      });
  };

  const handleUpdateLink = async (formData: EpicLink, linkId: string) => {
    if (!workspaceSlug || !projectId) return;

    const payload = { metadata: {}, ...formData };

    await updateEpicLink(workspaceSlug.toString(), projectId.toString(), epicId.toString(), linkId, payload)
      .then(() =>
        captureSuccess({
          eventName: EPIC_TRACKER_EVENTS.link.update,
          payload: { id: epicId },
        })
      )
      .catch((error) => {
        captureError({
          eventName: EPIC_TRACKER_EVENTS.link.update,
          payload: { id: epicId },
          error,
        });
      });
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!workspaceSlug || !projectId) return;

    deleteEpicLink(workspaceSlug.toString(), projectId.toString(), epicId.toString(), linkId)
      .then(() => {
        captureSuccess({
          eventName: EPIC_TRACKER_EVENTS.link.delete,
          payload: { id: epicId },
        });
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Module link deleted successfully.",
        });
      })
      .catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Some error occurred",
        });
        captureError({
          eventName: EPIC_TRACKER_EVENTS.link.delete,
          payload: { id: epicId },
        });
      });
  };

  const handleDateChange = async (startDate: Date | undefined, targetDate: Date | undefined) => {
    submitChanges({
      start_date: startDate ? renderFormattedPayloadDate(startDate) : null,
      target_date: targetDate ? renderFormattedPayloadDate(targetDate) : null,
    });
    setToast({
      type: TOAST_TYPE.SUCCESS,
      title: "Success!",
      message: "Module updated successfully.",
    });
  };

  useEffect(() => {
    if (epicDetails)
      reset({
        ...epicDetails,
      });
  }, [epicDetails, reset]);

  const handleEditLink = (link: ILinkDetails) => {
    setSelectedLinkToUpdate(link);
    setModuleLinkModal(true);
  };

  if (!epicDetails)
    return (
      <Loader>
        <div className="space-y-2">
          <Loader.Item height="15px" width="50%" />
          <Loader.Item height="15px" width="30%" />
        </div>
        <div className="mt-8 space-y-3">
          <Loader.Item height="30px" />
          <Loader.Item height="30px" />
          <Loader.Item height="30px" />
        </div>
      </Loader>
    );

  const moduleStatus = EPIC_STATUS.find((status) => status.value === epicDetails.status);

  const issueCount =
    epicDetails.total_issues === 0
      ? "0 work items"
      : `${epicDetails.completed_issues}/${epicDetails.total_issues}`;

  const issueEstimatePointCount =
    epicDetails.total_estimate_points === 0
      ? "0 work items"
      : `${epicDetails.completed_estimate_points}/${epicDetails.total_estimate_points}`;

  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  return (
    <div className="relative">
      <CreateUpdateModuleLinkModal
        isOpen={moduleLinkModal}
        handleClose={() => {
          setModuleLinkModal(false);
          setTimeout(() => {
            setSelectedLinkToUpdate(null);
          }, 500);
        }}
        data={selectedLinkToUpdate}
        createLink={handleCreateLink}
        updateLink={handleUpdateLink}
      />
      <>
        <div className={`sticky z-10 top-0 flex items-center justify-between bg-surface-1 pb-5 pt-5`}>
          <div>
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full bg-layer-3"
              onClick={() => handleClose()}
            >
              <ChevronRightIcon className="h-3 w-3 stroke-2 text-on-color" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-5 pt-2">
            <Controller
              control={control}
              name="status"
              render={({ field: { value } }) => (
                <CustomSelect
                  customButton={
                    <span
                      className={`flex h-6 w-20 items-center justify-center rounded-xs text-center text-11 ${
                        isEditingAllowed && !isArchived ? "cursor-pointer" : "cursor-not-allowed"
                      }`}
                      style={{
                        color: moduleStatus ? moduleStatus.color : "#a3a3a2",
                        backgroundColor: moduleStatus ? `${moduleStatus.color}20` : "#a3a3a220",
                      }}
                    >
                      {(moduleStatus && t(moduleStatus?.i18n_label)) ?? t("project_modules.status.backlog")}
                    </span>
                  }
                  value={value}
                  onChange={(value: any) => {
                    submitChanges({ status: value });
                  }}
                  disabled={!isEditingAllowed || isArchived}
                >
                  {EPIC_STATUS.map((status) => (
                    <CustomSelect.Option key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <ModuleStatusIcon status={status.value} />
                        {t(status.i18n_label)}
                      </div>
                    </CustomSelect.Option>
                  ))}
                </CustomSelect>
              )}
            />
          </div>
          <h4 className="w-full break-words text-18 font-semibold text-primary">{epicDetails.name}</h4>
        </div>

        {epicDetails.description && (
          <TextArea
            className="outline-none ring-none w-full max-h-max bg-transparent !p-0 !m-0 !border-0 resize-none text-13 leading-5 text-secondary"
            value={epicDetails.description}
            disabled
          />
        )}

        <div className="flex flex-col gap-5 pb-6 pt-2.5">
          <div className="flex items-center justify-start gap-1">
            <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
              <StartDatePropertyIcon className="h-4 w-4" />
              <span className="text-14">{t("date_range")}</span>
            </div>
            <div className="h-7">
              <Controller
                control={control}
                name="start_date"
                render={({ field: { value: startDateValue, onChange: onChangeStartDate } }) => (
                  <Controller
                    control={control}
                    name="target_date"
                    render={({ field: { value: endDateValue, onChange: onChangeEndDate } }) => {
                      const startDate = getDate(startDateValue);
                      const endDate = getDate(endDateValue);
                      return (
                        <DateRangeDropdown
                          buttonContainerClassName="w-full"
                          buttonVariant="background-with-text"
                          value={{
                            from: startDate,
                            to: endDate,
                          }}
                          onSelect={(val) => {
                            onChangeStartDate(val?.from ? renderFormattedPayloadDate(val.from) : null);
                            onChangeEndDate(val?.to ? renderFormattedPayloadDate(val.to) : null);
                            handleDateChange(val?.from, val?.to);
                          }}
                          placeholder={{
                            from: t("start_date"),
                            to: t("end_date"),
                          }}
                          disabled={!isEditingAllowed || isArchived}
                        />
                      );
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex items-center justify-start gap-1">
            <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
              <SquareUser className="h-4 w-4" />
              <span className="text-14">{t("lead")}</span>
            </div>
            <Controller
              control={control}
              name="lead_id"
              render={({ field: { value } }) => (
                <div className="h-7 w-3/5">
                  <MemberDropdown
                    value={value ?? null}
                    onChange={(val) => {
                      submitChanges({ lead_id: val });
                    }}
                    projectId={projectId?.toString() ?? ""}
                    multiple={false}
                    buttonVariant="background-with-text"
                    placeholder={t("lead")}
                    disabled={!isEditingAllowed || isArchived}
                    icon={SquareUser}
                  />
                </div>
              )}
            />
          </div>
          <div className="flex items-center justify-start gap-1">
            <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
              <MembersPropertyIcon className="h-4 w-4" />
              <span className="text-14">{t("members")}</span>
            </div>
            <Controller
              control={control}
              name="member_ids"
              render={({ field: { value } }) => (
                <div className="h-7 w-3/5">
                  <MemberDropdown
                    value={value ?? []}
                    onChange={(val: string[]) => {
                      submitChanges({ member_ids: val });
                    }}
                    multiple
                    projectId={projectId?.toString() ?? ""}
                    buttonVariant={value && value?.length > 0 ? "transparent-without-text" : "background-with-text"}
                    buttonClassName={value && value.length > 0 ? "hover:bg-transparent px-0" : ""}
                    disabled={!isEditingAllowed || isArchived}
                  />
                </div>
              )}
            />
          </div>
          <div className="flex items-center justify-start gap-1">
            <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
              <WorkItemsIcon className="h-4 w-4" />
              <span className="text-14">{t("issues")}</span>
            </div>
            <div className="flex h-7 w-3/5 items-center">
              <span className="px-1.5 text-13 text-tertiary">{issueCount}</span>
            </div>
          </div>

          {/**
           * NOTE: Render this section when estimate points of he projects is enabled and the estimate system is points
           */}
          {isEstimatePointValid && (
            <div className="flex items-center justify-start gap-1">
              <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
                <WorkItemsIcon className="h-4 w-4" />
                <span className="text-14">{t("points")}</span>
              </div>
              <div className="flex h-7 w-3/5 items-center">
                <span className="px-1.5 text-13 text-tertiary">{issueEstimatePointCount}</span>
              </div>
            </div>
          )}
        </div>

        {workspaceSlug && projectId && epicDetails?.id && (
          <ModuleAnalyticsProgress
            workspaceSlug={workspaceSlug.toString()}
            projectId={projectId.toString()}
            epicId={epicDetails?.id}
          />
        )}

        <div className="flex flex-col">
          <div className="flex w-full flex-col items-center justify-start gap-2 border-t border-subtle px-1.5 py-5">
            {/* Accessing link outside the disclosure as mobx is not  considering the children inside Disclosure as part of the component hence not observing their state change*/}
            <Disclosure defaultOpen={!!epicDetails?.link_epic?.length}>
              {({ open }) => (
                <div className={`relative  flex  h-full w-full flex-col ${open ? "" : "flex-row"}`}>
                  <Disclosure.Button className="flex w-full items-center justify-between gap-2 p-1.5">
                    <div className="flex items-center justify-start gap-2 text-13">
                      <span className="font-medium text-secondary">{t("common.links")}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ChevronDownIcon
                        className={`h-3.5 w-3.5 ${open ? "rotate-180 transform" : ""}`}
                        aria-hidden="true"
                      />
                    </div>
                  </Disclosure.Button>
                  <Transition show={open}>
                    <Disclosure.Panel>
                      <div className="mt-2 flex min-h-72 w-full flex-col space-y-3 overflow-y-auto">
                        {isEditingAllowed && epicDetails.link_epic && epicDetails.link_epic.length > 0 ? (
                          <>
                            {isEditingAllowed && !isArchived && (
                              <div className="flex w-full items-center justify-end">
                                <button
                                  className="flex items-center gap-1.5 text-13 font-medium text-accent-primary"
                                  onClick={() => setModuleLinkModal(true)}
                                >
                                  <Plus className="h-3 w-3" />
                                  {t("add_link")}
                                </button>
                              </div>
                            )}

                            {epicId && (
                              <ModuleLinksList
                                epicId={epicId}
                                handleEditLink={handleEditLink}
                                handleDeleteLink={handleDeleteLink}
                                disabled={!isEditingAllowed || isArchived}
                              />
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Info className="h-3.5 w-3.5 stroke-[1.5] text-tertiary" />
                              <span className="p-0.5 text-11 text-tertiary">{t("common.no_links_added_yet")}</span>
                            </div>
                            {isEditingAllowed && !isArchived && (
                              <button
                                className="flex items-center gap-1.5 text-13 font-medium text-accent-primary"
                                onClick={() => setModuleLinkModal(true)}
                              >
                                <Plus className="h-3 w-3" />
                                {t("add_link")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </div>
              )}
            </Disclosure>
          </div>
        </div>
      </>
    </div>
  );
});

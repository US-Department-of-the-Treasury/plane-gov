import type { SyntheticEvent } from "react";
import React, { useRef } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { Info, SquareUser } from "lucide-react";
// plane package imports
import {
  EPIC_STATUS,
  PROGRESS_STATE_GROUPS_DETAILS,
  EUserPermissions,
  EUserPermissionsLevel,
  IS_FAVORITE_MENU_OPEN,
  EPIC_TRACKER_EVENTS,
  MODULE_TRACKER_ELEMENTS,
} from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { WorkItemsIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setPromiseToast, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { IEpic } from "@plane/types";
import { Card, FavoriteStar, LinearProgressIndicator } from "@plane/ui";
import { getDate, renderFormattedPayloadDate, generateQueryParams } from "@plane/utils";
// components
import { DateRangeDropdown } from "@/components/dropdowns/date-range";
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
import { EpicQuickActions } from "@/components/epics";
import { EpicStatusDropdown } from "@/components/epics/module-status-dropdown";
// helpers
import { captureElementAndEvent } from "@/helpers/event-tracker.helper";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useEpic } from "@/hooks/store/use-epic";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";

type Props = {
  epicId: string;
};

export const EpicCardItem = observer(function EpicCardItem(props: Props) {
  const { epicId } = props;
  // refs
  const parentRef = useRef(null);
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // store hooks
  const { allowPermissions } = useUserPermissions();
  const { getEpicById, addEpicToFavorites, removeEpicFromFavorites, updateEpicDetails } = useEpic();
  const { getUserDetails } = useMember();
  // local storage
  const { setValue: toggleFavoriteMenu, storedValue } = useLocalStorage<boolean>(IS_FAVORITE_MENU_OPEN, false);
  // derived values
  const epicDetails = getEpicById(epicId);
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );
  const isDisabled = !isEditingAllowed || !!epicDetails?.archived_at;
  const renderIcon = Boolean(epicDetails?.start_date) || Boolean(epicDetails?.target_date);

  const { isMobile } = usePlatformOS();
  const handleAddToFavorites = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!workspaceSlug || !projectId) return;

    const addToFavoritePromise = addEpicToFavorites(workspaceSlug.toString(), projectId.toString(), epicId).then(
      () => {
        if (!storedValue) toggleFavoriteMenu(true);
        captureElementAndEvent({
          element: {
            elementName: MODULE_TRACKER_ELEMENTS.CARD_ITEM,
          },
          event: {
            eventName: EPIC_TRACKER_EVENTS.favorite,
            payload: { id: epicId },
            state: "SUCCESS",
          },
        });
      }
    );

    setPromiseToast(addToFavoritePromise, {
      loading: "Adding module to favorites...",
      success: {
        title: "Success!",
        message: () => "Module added to favorites.",
      },
      error: {
        title: "Error!",
        message: () => "Couldn't add the module to favorites. Please try again.",
      },
    });
  };

  const handleRemoveFromFavorites = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!workspaceSlug || !projectId) return;

    const removeFromFavoritePromise = removeEpicFromFavorites(
      workspaceSlug.toString(),
      projectId.toString(),
      epicId
    ).then(() => {
      captureElementAndEvent({
        element: {
          elementName: MODULE_TRACKER_ELEMENTS.CARD_ITEM,
        },
        event: {
          eventName: EPIC_TRACKER_EVENTS.unfavorite,
          payload: { id: epicId },
          state: "SUCCESS",
        },
      });
    });

    setPromiseToast(removeFromFavoritePromise, {
      loading: "Removing module from favorites...",
      success: {
        title: "Success!",
        message: () => "Module removed from favorites.",
      },
      error: {
        title: "Error!",
        message: () => "Couldn't remove the module from favorites. Please try again.",
      },
    });
  };

  const handleEventPropagation = (e: SyntheticEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleEpicDetailsChange = async (payload: Partial<IEpic>) => {
    if (!workspaceSlug || !projectId) return;

    await updateEpicDetails(workspaceSlug.toString(), projectId.toString(), epicId, payload)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Module updated successfully.",
        });
      })
      .catch((err) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.detail ?? "Module could not be updated. Please try again.",
        });
      });
  };

  const openModuleOverview = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const query = generateQueryParams(searchParams, ["peekModule"]);
    if (searchParams.has("peekModule") && searchParams.get("peekModule") === epicId) {
      router.push(`${pathname}?${query}`);
    } else {
      router.push(`${pathname}?${query && `${query}&`}peekModule=${epicId}`);
    }
  };

  if (!epicDetails) return null;

  const moduleTotalIssues =
    epicDetails.backlog_issues +
    epicDetails.unstarted_issues +
    epicDetails.started_issues +
    epicDetails.completed_issues +
    epicDetails.cancelled_issues;

  const moduleCompletedIssues = epicDetails.completed_issues;

  // const areYearsEqual = startDate.getFullYear() === endDate.getFullYear();

  const moduleStatus = EPIC_STATUS.find((status) => status.value === epicDetails.status);

  const issueCount = epicDetails
    ? !moduleTotalIssues || moduleTotalIssues === 0
      ? `0 work items`
      : moduleTotalIssues === moduleCompletedIssues
        ? `${moduleTotalIssues} Work item${moduleTotalIssues > 1 ? `s` : ``}`
        : `${moduleCompletedIssues}/${moduleTotalIssues} Work items`
    : `0 work items`;

  const moduleLeadDetails = epicDetails.lead_id ? getUserDetails(epicDetails.lead_id) : undefined;

  const progressIndicatorData = PROGRESS_STATE_GROUPS_DETAILS.map((group, index) => ({
    id: index,
    name: group.title,
    value: moduleTotalIssues > 0 ? (epicDetails[group.key as keyof IEpic] as number) : 0,
    color: group.color,
  }));

  return (
    <div className="relative" data-prevent-progress>
      <Link ref={parentRef} href={`/${workspaceSlug}/projects/${epicDetails.project_id}/epics/${epicDetails.id}`}>
        <Card>
          <div>
            <div className="flex items-center justify-between gap-2">
              <Tooltip tooltipContent={epicDetails.name} position="top" isMobile={isMobile}>
                <span className="truncate text-14 font-medium">{epicDetails.name}</span>
              </Tooltip>
              <div className="flex items-center gap-2" onClick={handleEventPropagation}>
                {moduleStatus && (
                  <EpicStatusDropdown
                    isDisabled={isDisabled}
                    epicDetails={epicDetails}
                    handleEpicDetailsChange={handleEpicDetailsChange}
                  />
                )}
                <button onClick={openModuleOverview}>
                  <Info className="h-4 w-4 text-placeholder" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-secondary">
                <WorkItemsIcon className="h-4 w-4 text-tertiary" />
                <span className="text-11 text-tertiary">{issueCount ?? "0 Work item"}</span>
              </div>
              {moduleLeadDetails ? (
                <span className="cursor-default">
                  <ButtonAvatars showTooltip={false} userIds={moduleLeadDetails?.id} />
                </span>
              ) : (
                <Tooltip tooltipContent="No lead">
                  <SquareUser className="h-4 w-4 mx-1 text-tertiary " />
                </Tooltip>
              )}
            </div>
            <LinearProgressIndicator size="lg" data={progressIndicatorData} />
            <div className="flex items-center justify-between py-0.5" onClick={handleEventPropagation}>
              <DateRangeDropdown
                buttonContainerClassName={`h-6 w-full flex ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"} items-center gap-1.5 text-tertiary border-[0.5px] border-strong rounded-sm text-11`}
                buttonVariant="transparent-with-text"
                className="h-7"
                value={{
                  from: getDate(epicDetails.start_date),
                  to: getDate(epicDetails.target_date),
                }}
                onSelect={(val) => {
                  handleEpicDetailsChange({
                    start_date: val?.from ? renderFormattedPayloadDate(val.from) : null,
                    target_date: val?.to ? renderFormattedPayloadDate(val.to) : null,
                  });
                }}
                placeholder={{
                  from: "Start date",
                  to: "End date",
                }}
                disabled={isDisabled}
                hideIcon={{ from: renderIcon ?? true, to: renderIcon }}
              />
            </div>
          </div>
        </Card>
      </Link>
      <div className="absolute right-4 bottom-[18px] flex items-center gap-1.5">
        {isEditingAllowed && (
          <FavoriteStar
            onClick={(e) => {
              if (epicDetails.is_favorite) handleRemoveFromFavorites(e);
              else handleAddToFavorites(e);
            }}
            selected={!!epicDetails.is_favorite}
          />
        )}
        {workspaceSlug && projectId && (
          <EpicQuickActions
            parentRef={parentRef}
            epicId={epicId}
            projectId={projectId.toString()}
            workspaceSlug={workspaceSlug.toString()}
          />
        )}
      </div>
    </div>
  );
});

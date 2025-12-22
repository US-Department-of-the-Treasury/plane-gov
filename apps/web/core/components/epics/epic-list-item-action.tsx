import React from "react";
import { useParams } from "next/navigation";
// icons
import { SquareUser } from "lucide-react";
// types
import {
  EPIC_STATUS,
  EUserPermissions,
  EUserPermissionsLevel,
  IS_FAVORITE_MENU_OPEN,
  EPIC_TRACKER_EVENTS,
  EPIC_TRACKER_ELEMENTS,
} from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setPromiseToast, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { IEpic } from "@plane/types";
// ui
import { FavoriteStar } from "@plane/ui";
// components
import { renderFormattedPayloadDate, getDate } from "@plane/utils";
import { DateRangeDropdown } from "@/components/dropdowns/date-range";
import { EpicQuickActions } from "@/components/epics";
import { EpicStatusDropdown } from "@/components/epics/epic-status-dropdown";
// constants
// helpers
import { captureElementAndEvent, captureError } from "@/helpers/event-tracker.helper";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
import { useAddEpicToFavorites, useRemoveEpicFromFavorites, useUpdateEpic } from "@/store/queries/epic";
import { useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
import { ButtonAvatars } from "../dropdowns/member/avatar";

type Props = {
  epicId: string;
  epicDetails: IEpic;
  parentRef: React.RefObject<HTMLDivElement>;
};

export function EpicListItemAction(props: Props) {
  const { epicId, epicDetails, parentRef } = props;
  // router
  const { workspaceSlug, projectId } = useParams();
  //   store hooks
  const { allowPermissions } = useUserPermissions();
  // mutation hooks
  const { mutate: addToFavorites } = useAddEpicToFavorites();
  const { mutate: removeFromFavorites } = useRemoveEpicFromFavorites();
  const { mutate: updateEpic } = useUpdateEpic();
  // query hooks
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString() ?? "");

  const { t } = useTranslation();

  // local storage
  const { setValue: toggleFavoriteMenu, storedValue } = useLocalStorage<boolean>(IS_FAVORITE_MENU_OPEN, false);
  // derived values

  const epicStatus = EPIC_STATUS.find((status) => status.value === epicDetails.status);
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );
  const isDisabled = !isEditingAllowed || !!epicDetails?.archived_at;
  const renderIcon = Boolean(epicDetails.start_date) || Boolean(epicDetails.target_date);

  // handlers
  const handleAddToFavorites = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!workspaceSlug || !projectId) return;

    const addToFavoritePromise = new Promise<void>((resolve, reject) => {
      addToFavorites(
        {
          workspaceSlug: workspaceSlug.toString(),
          projectId: projectId.toString(),
          epicId,
        },
        {
          onSuccess: () => {
            // open favorites menu if closed
            if (!storedValue) toggleFavoriteMenu(true);
            captureElementAndEvent({
              element: {
                elementName: EPIC_TRACKER_ELEMENTS.LIST_ITEM,
              },
              event: {
                eventName: EPIC_TRACKER_EVENTS.favorite,
                payload: { id: epicId },
                state: "SUCCESS",
              },
            });
            resolve();
          },
          onError: (error) => {
            captureError({
              eventName: EPIC_TRACKER_EVENTS.favorite,
              payload: { id: epicId },
              error,
            });
            reject(error);
          },
        }
      );
    });

    setPromiseToast(addToFavoritePromise, {
      loading: "Adding epic to favorites...",
      success: {
        title: "Success!",
        message: () => "Epic added to favorites.",
      },
      error: {
        title: "Error!",
        message: () => "Couldn't add the epic to favorites. Please try again.",
      },
    });
  };

  const handleRemoveFromFavorites = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!workspaceSlug || !projectId) return;

    const removeFromFavoritePromise = new Promise<void>((resolve, reject) => {
      removeFromFavorites(
        {
          workspaceSlug: workspaceSlug.toString(),
          projectId: projectId.toString(),
          epicId,
        },
        {
          onSuccess: () => {
            captureElementAndEvent({
              element: {
                elementName: EPIC_TRACKER_ELEMENTS.LIST_ITEM,
              },
              event: {
                eventName: EPIC_TRACKER_EVENTS.unfavorite,
                payload: { id: epicId },
                state: "SUCCESS",
              },
            });
            resolve();
          },
          onError: (error) => {
            captureError({
              eventName: EPIC_TRACKER_EVENTS.unfavorite,
              payload: { id: epicId },
              error,
            });
            reject(error);
          },
        }
      );
    });

    setPromiseToast(removeFromFavoritePromise, {
      loading: "Removing epic from favorites...",
      success: {
        title: "Success!",
        message: () => "Epic removed from favorites.",
      },
      error: {
        title: "Error!",
        message: () => "Couldn't remove the epic from favorites. Please try again.",
      },
    });
  };

  const handleEpicDetailsChange = async (payload: Partial<IEpic>): Promise<void> => {
    if (!workspaceSlug || !projectId) return;

    return new Promise<void>((resolve, reject) => {
      updateEpic(
        {
          workspaceSlug: workspaceSlug.toString(),
          projectId: projectId.toString(),
          epicId,
          data: payload,
        },
        {
          onSuccess: () => {
            setToast({
              type: TOAST_TYPE.SUCCESS,
              title: "Success!",
              message: "Epic updated successfully.",
            });
            resolve();
          },
          onError: (err: any) => {
            setToast({
              type: TOAST_TYPE.ERROR,
              title: "Error!",
              message: err?.detail ?? "Epic could not be updated. Please try again.",
            });
            reject(err);
          },
        }
      );
    });
  };

  const epicLeadDetails = epicDetails.lead_id
    ? getWorkspaceMemberByUserId(workspaceMembers, epicDetails.lead_id)
    : undefined;

  return (
    <>
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
        mergeDates
        placeholder={{
          from: t("start_date"),
          to: t("end_date"),
        }}
        disabled={isDisabled}
        hideIcon={{ from: renderIcon ?? true, to: renderIcon }}
      />

      {epicStatus && (
        <EpicStatusDropdown
          isDisabled={isDisabled}
          epicDetails={epicDetails}
          handleEpicDetailsChange={handleEpicDetailsChange}
        />
      )}

      {epicLeadDetails ? (
        <span className="cursor-default">
          <ButtonAvatars showTooltip={false} userIds={epicLeadDetails?.id} />
        </span>
      ) : (
        <Tooltip tooltipContent="No lead">
          <SquareUser className="h-4 w-4 text-tertiary" />
        </Tooltip>
      )}

      {isEditingAllowed && !epicDetails.archived_at && (
        <FavoriteStar
          onClick={(e) => {
            if (epicDetails.is_favorite) handleRemoveFromFavorites(e);
            else handleAddToFavorites(e);
          }}
          selected={epicDetails.is_favorite}
        />
      )}
      {workspaceSlug && projectId && (
        <div className="hidden md:block">
          <EpicQuickActions
            parentRef={parentRef}
            epicId={epicId}
            projectId={projectId.toString()}
            workspaceSlug={workspaceSlug.toString()}
          />
        </div>
      )}
    </>
  );
}

import type { SyntheticEvent } from "react";
import React, { useRef } from "react";
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
  EPIC_TRACKER_ELEMENTS,
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
import { EpicStatusDropdown } from "@/components/epics/epic-status-dropdown";
// helpers
import { captureElementAndEvent } from "@/helpers/event-tracker.helper";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";
import {
  useProjectEpics,
  getEpicById,
  useUpdateEpic,
  useAddEpicToFavorites,
  useRemoveEpicFromFavorites,
} from "@/store/queries/epic";
import { useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";

type Props = {
  epicId: string;
};

export function EpicCardItem(props: Props) {
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
  // query hooks
  const { data: epics } = useProjectEpics(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString() ?? "");
  // mutation hooks
  const { mutate: updateEpic } = useUpdateEpic();
  const { mutate: addToFavorites } = useAddEpicToFavorites();
  const { mutate: removeFromFavorites } = useRemoveEpicFromFavorites();
  // local storage
  const { setValue: toggleFavoriteMenu, storedValue } = useLocalStorage<boolean>(IS_FAVORITE_MENU_OPEN, false);
  // derived values
  const epicDetails = getEpicById(epics, epicId);
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

    const addToFavoritePromise = new Promise<void>((resolve, reject) => {
      addToFavorites(
        {
          workspaceSlug: workspaceSlug.toString(),
          projectId: projectId.toString(),
          epicId,
        },
        {
          onSuccess: () => {
            if (!storedValue) toggleFavoriteMenu(true);
            captureElementAndEvent({
              element: {
                elementName: EPIC_TRACKER_ELEMENTS.CARD_ITEM,
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
                elementName: EPIC_TRACKER_ELEMENTS.CARD_ITEM,
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

  const handleEventPropagation = (e: SyntheticEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
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

  const openEpicOverview = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const query = generateQueryParams(searchParams, ["peekEpic"]);
    if (searchParams.has("peekEpic") && searchParams.get("peekEpic") === epicId) {
      router.push(`${pathname}?${query}`);
    } else {
      router.push(`${pathname}?${query && `${query}&`}peekEpic=${epicId}`);
    }
  };

  if (!epicDetails) return null;

  const epicTotalIssues =
    epicDetails.backlog_issues +
    epicDetails.unstarted_issues +
    epicDetails.started_issues +
    epicDetails.completed_issues +
    epicDetails.cancelled_issues;

  const epicCompletedIssues = epicDetails.completed_issues;

  // const areYearsEqual = startDate.getFullYear() === endDate.getFullYear();

  const epicStatus = EPIC_STATUS.find((status) => status.value === epicDetails.status);

  const issueCount = epicDetails
    ? !epicTotalIssues || epicTotalIssues === 0
      ? `0 work items`
      : epicTotalIssues === epicCompletedIssues
        ? `${epicTotalIssues} Work item${epicTotalIssues > 1 ? `s` : ``}`
        : `${epicCompletedIssues}/${epicTotalIssues} Work items`
    : `0 work items`;

  const epicLeadDetails = epicDetails?.lead_id
    ? getWorkspaceMemberByUserId(workspaceMembers, epicDetails.lead_id)
    : undefined;

  const progressIndicatorData = PROGRESS_STATE_GROUPS_DETAILS.map((group, index) => ({
    id: index,
    name: group.title,
    value: epicTotalIssues > 0 ? (epicDetails[group.key as keyof IEpic] as number) : 0,
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
                {epicStatus && (
                  <EpicStatusDropdown
                    isDisabled={isDisabled}
                    epicDetails={epicDetails}
                    handleEpicDetailsChange={handleEpicDetailsChange}
                  />
                )}
                <button onClick={openEpicOverview}>
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
              {epicLeadDetails ? (
                <span className="cursor-default">
                  <ButtonAvatars showTooltip={false} userIds={epicLeadDetails?.id} />
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
}

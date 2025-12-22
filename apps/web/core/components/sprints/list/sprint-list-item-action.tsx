import type { MouseEvent } from "react";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, ArrowRight, CalendarDays } from "lucide-react";
// plane imports
import {
  SPRINT_TRACKER_EVENTS,
  EUserPermissions,
  EUserPermissionsLevel,
  IS_FAVORITE_MENU_OPEN,
  SPRINT_TRACKER_ELEMENTS,
} from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { useTranslation } from "@plane/i18n";
import { TransferIcon, WorkItemsIcon, MembersPropertyIcon } from "@plane/propel/icons";
import { setPromiseToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { ISprint, TSprintGroups } from "@plane/types";
import { Avatar, AvatarGroup, FavoriteStar } from "@plane/ui";
import { getDate, getFileURL, generateQueryParams } from "@plane/utils";
// components
import { DateRangeDropdown } from "@/components/dropdowns/date-range";
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
import { MergedDateDisplay } from "@/components/dropdowns/merged-date";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useSprint } from "@/hooks/store/use-sprint";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useTimeZoneConverter } from "@/hooks/use-timezone-converter";
// queries
import { useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
// plane web components
import { SprintAdditionalActions } from "@/plane-web/components/sprints";
// local imports
import { SprintQuickActions } from "../quick-actions";
import { TransferIssuesModal } from "../transfer-issues-modal";

type Props = {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
  sprintDetails: ISprint;
  parentRef: React.RefObject<HTMLDivElement>;
  isActive?: boolean;
};

const defaultValues: Partial<ISprint> = {
  start_date: null,
  end_date: null,
};

export function SprintListItemAction(props: Props) {
  const { workspaceSlug, projectId, sprintId, sprintDetails, parentRef, isActive = false } = props;
  // router
  const { projectId: routerProjectId } = useParams();
  //states
  const [transferIssuesModal, setTransferIssuesModal] = useState(false);
  // hooks
  const { isMobile } = usePlatformOS();
  const { t } = useTranslation();
  const { isProjectTimeZoneDifferent, getProjectUTCOffset, renderFormattedDateInUserTimezone } =
    useTimeZoneConverter(projectId);
  // router
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // store hooks
  const { addSprintToFavorites, removeSprintFromFavorites } = useSprint();
  const { allowPermissions } = useUserPermissions();
  // queries
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceSlug);

  // local storage
  const { setValue: toggleFavoriteMenu, storedValue: isFavoriteMenuOpen } = useLocalStorage<boolean>(
    IS_FAVORITE_MENU_OPEN,
    false
  );

  // form
  const { reset } = useForm({
    defaultValues,
  });

  // derived values
  const sprintStatus = sprintDetails.status ? (sprintDetails.status.toLocaleLowerCase() as TSprintGroups) : "draft";

  const showIssueCount = useMemo(() => sprintStatus === "draft" || sprintStatus === "upcoming", [sprintStatus]);

  const transferableIssuesCount = sprintDetails
    ? sprintDetails.total_issues - (sprintDetails.cancelled_issues + sprintDetails.completed_issues)
    : 0;

  const showTransferIssues = routerProjectId && transferableIssuesCount > 0 && sprintStatus === "completed";

  const projectUTCOffset = getProjectUTCOffset();

  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  // handlers
  const handleAddToFavorites = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!workspaceSlug || !projectId) return;

    const addToFavoritePromise = addSprintToFavorites(workspaceSlug?.toString(), projectId.toString(), sprintId)
      .then(() => {
        if (!isFavoriteMenuOpen) toggleFavoriteMenu(true);
        captureSuccess({
          eventName: SPRINT_TRACKER_EVENTS.favorite,
          payload: {
            id: sprintId,
          },
        });
      })
      .catch((error) => {
        captureError({
          eventName: SPRINT_TRACKER_EVENTS.favorite,
          payload: {
            id: sprintId,
          },
          error,
        });
      });

    setPromiseToast(addToFavoritePromise, {
      loading: t("project_sprints.action.favorite.loading"),
      success: {
        title: t("project_sprints.action.favorite.success.title"),
        message: () => t("project_sprints.action.favorite.success.description"),
      },
      error: {
        title: t("project_sprints.action.favorite.failed.title"),
        message: () => t("project_sprints.action.favorite.failed.description"),
      },
    });
  };

  const handleRemoveFromFavorites = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!workspaceSlug || !projectId) return;

    const removeFromFavoritePromise = removeSprintFromFavorites(workspaceSlug?.toString(), projectId.toString(), sprintId)
      .then(() => {
        captureSuccess({
          eventName: SPRINT_TRACKER_EVENTS.unfavorite,
          payload: {
            id: sprintId,
          },
        });
      })
      .catch((error) => {
        captureError({
          eventName: SPRINT_TRACKER_EVENTS.unfavorite,
          payload: {
            id: sprintId,
          },
          error,
        });
      });

    setPromiseToast(removeFromFavoritePromise, {
      loading: t("project_sprints.action.unfavorite.loading"),
      success: {
        title: t("project_sprints.action.unfavorite.success.title"),
        message: () => t("project_sprints.action.unfavorite.success.description"),
      },
      error: {
        title: t("project_sprints.action.unfavorite.failed.title"),
        message: () => t("project_sprints.action.unfavorite.failed.description"),
      },
    });
  };

  const createdByDetails = sprintDetails.created_by
    ? getWorkspaceMemberByUserId(workspaceMembers, sprintDetails.created_by)?.member
    : undefined;

  useEffect(() => {
    if (sprintDetails)
      reset({
        ...sprintDetails,
      });
  }, [sprintDetails, reset]);

  // handlers
  const openSprintOverview = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const query = generateQueryParams(searchParams, ["peekSprint"]);
    if (searchParams.has("peekSprint") && searchParams.get("peekSprint") === sprintId) {
      router.push(`${pathname}?${query}`);
    } else {
      router.push(`${pathname}?${query && `${query}&`}peekSprint=${sprintId}`);
    }
  };

  return (
    <>
      <TransferIssuesModal
        handleClose={() => setTransferIssuesModal(false)}
        isOpen={transferIssuesModal}
        sprintId={sprintId.toString()}
      />
      <button
        onClick={openSprintOverview}
        className={`z-[1] flex text-accent-secondary text-11 gap-1 flex-shrink-0 ${isMobile || (isActive && !searchParams.has("peekSprint")) ? "flex" : "hidden group-hover:flex"}`}
      >
        <Eye className="h-4 w-4 my-auto  text-accent-secondary" />
        <span>{t("project_sprints.more_details")}</span>
      </button>
      {showIssueCount && (
        <div className="flex items-center gap-1">
          <WorkItemsIcon className="h-4 w-4 text-tertiary" />
          <span className="text-11 text-tertiary">{sprintDetails.total_issues}</span>
        </div>
      )}
      <SprintAdditionalActions sprintId={sprintId} projectId={projectId} />
      {showTransferIssues && (
        <div
          className="px-2 h-6  text-accent-secondary flex items-center gap-1 cursor-pointer"
          onClick={() => {
            setTransferIssuesModal(true);
          }}
        >
          <TransferIcon className="fill-accent-primary w-4" />
          <span>{t("project_sprints.transfer_work_items", { count: transferableIssuesCount })}</span>
        </div>
      )}
      {isActive ? (
        <>
          <div className="flex gap-2">
            {/* Duration */}
            <Tooltip
              tooltipContent={
                <span className="flex gap-1">
                  {renderFormattedDateInUserTimezone(sprintDetails.start_date ?? "")}
                  <ArrowRight className="h-3 w-3 flex-shrink-0 my-auto" />
                  {renderFormattedDateInUserTimezone(sprintDetails.end_date ?? "")}
                </span>
              }
              disabled={!isProjectTimeZoneDifferent()}
              tooltipHeading={t("project_sprints.in_your_timezone")}
            >
              <div className="flex gap-1 text-11 text-tertiary font-medium items-center">
                <CalendarDays className="h-3 w-3 flex-shrink-0 my-auto" />
                <MergedDateDisplay startDate={sprintDetails.start_date} endDate={sprintDetails.end_date} />
              </div>
            </Tooltip>
            {projectUTCOffset && (
              <span className="rounded-md text-11 px-2 cursor-default  py-1 bg-layer-1 text-tertiary">
                {projectUTCOffset}
              </span>
            )}
            {/* created by */}
            {createdByDetails && <ButtonAvatars showTooltip={false} userIds={createdByDetails?.id} />}
          </div>
        </>
      ) : (
        sprintDetails.start_date && (
          <>
            <DateRangeDropdown
              buttonVariant={"transparent-with-text"}
              buttonContainerClassName={`h-6 w-full cursor-auto flex items-center gap-1.5 text-tertiary rounded-sm text-11 [&>div]:hover:bg-transparent`}
              buttonClassName="p-0"
              minDate={new Date()}
              value={{
                from: getDate(sprintDetails.start_date),
                to: getDate(sprintDetails.end_date),
              }}
              placeholder={{
                from: t("project_sprints.start_date"),
                to: t("project_sprints.end_date"),
              }}
              showTooltip={isProjectTimeZoneDifferent()}
              customTooltipHeading={t("project_sprints.in_your_timezone")}
              customTooltipContent={
                <span className="flex gap-1">
                  {renderFormattedDateInUserTimezone(sprintDetails.start_date ?? "")}
                  <ArrowRight className="h-3 w-3 flex-shrink-0 my-auto" />
                  {renderFormattedDateInUserTimezone(sprintDetails.end_date ?? "")}
                </span>
              }
              mergeDates
              required={sprintDetails.status !== "draft"}
              disabled
              hideIcon={{
                from: false,
                to: false,
              }}
            />
          </>
        )
      )}
      {/* created by */}
      {createdByDetails && !isActive && <ButtonAvatars showTooltip={false} userIds={createdByDetails?.id} />}
      {!isActive && (
        <Tooltip tooltipContent={`${sprintDetails.assignee_ids?.length} Members`} isMobile={isMobile}>
          <div className="flex w-min cursor-default items-center justify-center">
            {sprintDetails.assignee_ids && sprintDetails.assignee_ids?.length > 0 ? (
              <AvatarGroup showTooltip={false}>
                {sprintDetails.assignee_ids?.map((assignee_id) => {
                  const memberData = getWorkspaceMemberByUserId(workspaceMembers, assignee_id);
                  const member = memberData?.member;
                  return (
                    <Avatar key={member?.id} name={member?.display_name} src={getFileURL(member?.avatar_url ?? "")} />
                  );
                })}
              </AvatarGroup>
            ) : (
              <MembersPropertyIcon className="h-4 w-4 text-tertiary" />
            )}
          </div>
        </Tooltip>
      )}
      {isEditingAllowed && !sprintDetails.archived_at && (
        <FavoriteStar
          data-ph-element={SPRINT_TRACKER_ELEMENTS.LIST_ITEM}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (sprintDetails.is_favorite) handleRemoveFromFavorites(e);
            else handleAddToFavorites(e);
          }}
          selected={!!sprintDetails.is_favorite}
        />
      )}
      <div className="hidden md:block">
        <SprintQuickActions
          parentRef={parentRef}
          sprintId={sprintId}
          projectId={projectId}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </>
  );
}

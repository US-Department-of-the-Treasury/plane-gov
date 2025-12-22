import { useState } from "react";
import { observer } from "mobx-react";
import { MoreHorizontal } from "lucide-react";

// ui
import {
  SPRINT_TRACKER_EVENTS,
  EUserPermissions,
  EUserPermissionsLevel,
  SPRINT_TRACKER_ELEMENTS,
} from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { IconButton } from "@plane/propel/icon-button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TContextMenuItem } from "@plane/ui";
import { ContextMenu, CustomMenu } from "@plane/ui";
import { copyUrlToClipboard, cn } from "@plane/utils";
// helpers
// hooks
import { useSprintMenuItems } from "@/components/common/quick-actions-helper";
import { captureClick, captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useProjectSprints, getSprintById, useRestoreSprint } from "@/store/queries/sprint";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// local imports
import { ArchiveSprintModal } from "./archived-sprints/modal";
import { SprintDeleteModal } from "./delete-modal";
import { SprintCreateUpdateModal } from "./modal";

type Props = {
  parentRef: React.RefObject<HTMLElement>;
  sprintId: string;
  projectId: string;
  workspaceSlug: string;
  customClassName?: string;
};

export const SprintQuickActions = observer(function SprintQuickActions(props: Props) {
  const { parentRef, sprintId, projectId, workspaceSlug, customClassName } = props;
  // router
  const router = useAppRouter();
  // states
  const [updateModal, setUpdateModal] = useState(false);
  const [archiveSprintModal, setArchiveSprintModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  // store hooks
  const { allowPermissions } = useUserPermissions();
  const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
  const { mutate: restoreSprintMutation } = useRestoreSprint();
  const { t } = useTranslation();
  // derived values
  const sprintDetails = getSprintById(sprints, sprintId);
  // auth
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  const sprintLink = `${workspaceSlug}/projects/${projectId}/sprints/${sprintId}`;
  const handleCopyText = () =>
    copyUrlToClipboard(sprintLink).then(() => {
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.link_copied"),
        message: t("common.link_copied_to_clipboard"),
      });
    });
  const handleOpenInNewTab = () => window.open(`/${sprintLink}`, "_blank");

  const handleRestoreSprint = async () => {
    restoreSprintMutation(
      {
        workspaceSlug,
        projectId,
        sprintId,
      },
      {
        onSuccess: () => {
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("project_sprints.action.restore.success.title"),
            message: t("project_sprints.action.restore.success.description"),
          });
          captureSuccess({
            eventName: SPRINT_TRACKER_EVENTS.restore,
            payload: {
              id: sprintId,
            },
          });
          router.push(`/${workspaceSlug}/projects/${projectId}/archives/sprints`);
        },
        onError: () => {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("project_sprints.action.restore.failed.title"),
            message: t("project_sprints.action.restore.failed.description"),
          });
          captureError({
            eventName: SPRINT_TRACKER_EVENTS.restore,
            payload: {
              id: sprintId,
            },
          });
        },
      }
    );
  };

  const menuResult = useSprintMenuItems({
    sprintDetails: sprintDetails ?? undefined,
    workspaceSlug,
    projectId,
    sprintId,
    isEditingAllowed,
    handleEdit: () => setUpdateModal(true),
    handleArchive: () => setArchiveSprintModal(true),
    handleRestore: handleRestoreSprint,
    handleDelete: () => setDeleteModal(true),
    handleCopyLink: handleCopyText,
    handleOpenInNewTab,
  });

  const MENU_ITEMS: TContextMenuItem[] = Array.isArray(menuResult) ? menuResult : menuResult.items;
  const additionalModals = Array.isArray(menuResult) ? null : menuResult.modals;

  const CONTEXT_MENU_ITEMS = MENU_ITEMS.map(function CONTEXT_MENU_ITEMS(item) {
    return {
      ...item,

      action: () => {
        captureClick({
          elementName: SPRINT_TRACKER_ELEMENTS.CONTEXT_MENU,
        });
        item.action();
      },
    };
  });

  return (
    <>
      {sprintDetails && (
        <div className="fixed">
          <SprintCreateUpdateModal
            data={sprintDetails}
            isOpen={updateModal}
            handleClose={() => setUpdateModal(false)}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
          />
          <ArchiveSprintModal
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            sprintId={sprintId}
            isOpen={archiveSprintModal}
            handleClose={() => setArchiveSprintModal(false)}
          />
          <SprintDeleteModal
            sprint={sprintDetails}
            isOpen={deleteModal}
            handleClose={() => setDeleteModal(false)}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
          />
          {additionalModals}
        </div>
      )}
      <ContextMenu parentRef={parentRef} items={CONTEXT_MENU_ITEMS} />
      <CustomMenu
        customButton={<IconButton variant="tertiary" size="lg" icon={MoreHorizontal} />}
        placement="bottom-end"
        closeOnSelect
        maxHeight="lg"
        buttonClassName={customClassName}
      >
        {MENU_ITEMS.map((item) => {
          if (item.shouldRender === false) return null;
          return (
            <CustomMenu.MenuItem
              key={item.key}
              onClick={() => {
                captureClick({
                  elementName: SPRINT_TRACKER_ELEMENTS.QUICK_ACTIONS,
                });
                item.action();
              }}
              className={cn(
                "flex items-center gap-2",
                {
                  "text-placeholder": item.disabled,
                },
                item.className
              )}
              disabled={item.disabled}
            >
              {item.icon && <item.icon className={cn("h-3 w-3 flex-shrink-0", item.iconClassName)} />}
              <div>
                <h5>{item.title}</h5>
                {item.description && (
                  <p
                    className={cn("text-tertiary whitespace-pre-line", {
                      "text-placeholder": item.disabled,
                    })}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </CustomMenu.MenuItem>
          );
        })}
      </CustomMenu>
    </>
  );
});

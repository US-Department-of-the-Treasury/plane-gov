import { useState } from "react";
import { observer } from "mobx-react";
import { MoreHorizontal } from "lucide-react";

// plane imports
import {
  EUserPermissions,
  EUserPermissionsLevel,
  EPIC_TRACKER_ELEMENTS,
  EPIC_TRACKER_EVENTS,
} from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { IconButton } from "@plane/propel/icon-button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TContextMenuItem } from "@plane/ui";
import { ContextMenu, CustomMenu } from "@plane/ui";
import { copyUrlToClipboard, cn } from "@plane/utils";
// components
import { useEpicMenuItems } from "@/components/common/quick-actions-helper";
import { ArchiveEpicModal, CreateUpdateEpicModal, DeleteEpicModal } from "@/components/epics";
// helpers
import { captureClick, captureSuccess, captureError } from "@/helpers/event-tracker.helper";
// hooks
import { useEpic } from "@/hooks/store/use-epic";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";

type Props = {
  parentRef: React.RefObject<HTMLDivElement>;
  epicId: string;
  projectId: string;
  workspaceSlug: string;
  customClassName?: string;
};

export const EpicQuickActions = observer(function EpicQuickActions(props: Props) {
  const { parentRef, epicId, projectId, workspaceSlug, customClassName } = props;
  // router
  const router = useAppRouter();
  // states
  const [editModal, setEditModal] = useState(false);
  const [archiveEpicModal, setArchiveEpicModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  // store hooks
  const { allowPermissions } = useUserPermissions();

  const { getEpicById, restoreEpic } = useEpic();

  const { t } = useTranslation();
  // derived values
  const epicDetails = getEpicById(epicId);
  // auth
  const isEditingAllowed = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  const epicLink = `${workspaceSlug}/projects/${projectId}/epics/${epicId}`;
  const handleCopyText = () =>
    copyUrlToClipboard(epicLink).then(() => {
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Link Copied!",
        message: "Epic link copied to clipboard.",
      });
    });
  const handleOpenInNewTab = () => window.open(`/${epicLink}`, "_blank");

  const handleRestoreEpic = async () =>
    await restoreEpic(workspaceSlug, projectId, epicId)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Restore success",
          message: "Your epic can be found in project epics.",
        });
        captureSuccess({
          eventName: EPIC_TRACKER_EVENTS.restore,
          payload: { id: epicId },
        });
        router.push(`/${workspaceSlug}/projects/${projectId}/archives/epics`);
      })
      .catch((error) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Epic could not be restored. Please try again.",
        });
        captureError({
          eventName: EPIC_TRACKER_EVENTS.restore,
          payload: { id: epicId },
          error,
        });
      });

  // Use unified menu hook from plane-web (resolves to CE or EE)
  const menuResult = useEpicMenuItems({
    epicDetails: epicDetails ?? undefined,
    workspaceSlug,
    projectId,
    epicId,
    isEditingAllowed,
    handleEdit: () => setEditModal(true),
    handleArchive: () => setArchiveEpicModal(true),
    handleRestore: handleRestoreEpic,
    handleDelete: () => setDeleteModal(true),
    handleCopyLink: handleCopyText,
    handleOpenInNewTab,
  });

  // Handle both CE (array) and EE (object) return types
  const MENU_ITEMS: TContextMenuItem[] = Array.isArray(menuResult) ? menuResult : menuResult.items;
  const additionalModals = Array.isArray(menuResult) ? null : menuResult.modals;

  const CONTEXT_MENU_ITEMS = MENU_ITEMS.map(function CONTEXT_MENU_ITEMS(item) {
    return {
      ...item,

      onClick: () => {
        captureClick({
          elementName: EPIC_TRACKER_ELEMENTS.CONTEXT_MENU,
        });
        item.action();
      },
    };
  });

  return (
    <>
      {epicDetails && (
        <div className="fixed">
          <CreateUpdateEpicModal
            isOpen={editModal}
            onClose={() => setEditModal(false)}
            data={epicDetails}
            projectId={projectId}
            workspaceSlug={workspaceSlug}
          />
          <ArchiveEpicModal
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            epicId={epicId}
            isOpen={archiveEpicModal}
            handleClose={() => setArchiveEpicModal(false)}
          />
          <DeleteEpicModal data={epicDetails} isOpen={deleteModal} onClose={() => setDeleteModal(false)} />
          {additionalModals}
        </div>
      )}
      <ContextMenu parentRef={parentRef} items={CONTEXT_MENU_ITEMS} />
      <CustomMenu
        customButton={<IconButton variant="tertiary" size="lg" icon={MoreHorizontal} />}
        placement="bottom-end"
        closeOnSelect
        buttonClassName={customClassName}
      >
        {MENU_ITEMS.map((item) => {
          if (item.shouldRender === false) return null;
          return (
            <CustomMenu.MenuItem
              key={item.key}
              onClick={() => {
                captureClick({
                  elementName: EPIC_TRACKER_ELEMENTS.QUICK_ACTIONS,
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

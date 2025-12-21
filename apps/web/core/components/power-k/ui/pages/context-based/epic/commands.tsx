import { useCallback } from "react";
import { useParams } from "next/navigation";
import { LinkIcon, Star, StarOff, Users } from "lucide-react";
// plane imports
import { EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EpicStatusIcon } from "@plane/propel/icons";
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import type { IEpic, TEpicStatus } from "@plane/types";
import { EUserPermissions } from "@plane/types";
import { copyTextToClipboard } from "@plane/utils";
// components
import type { TPowerKCommandConfig } from "@/components/power-k/core/types";
// hooks
import { useEpic } from "@/hooks/store/use-epic";
import { useUser } from "@/hooks/store/user";

export const usePowerKEpicContextBasedActions = (): TPowerKCommandConfig[] => {
  // navigation
  const { workspaceSlug, projectId, epicId } = useParams();
  // store
  const {
    permission: { allowPermissions },
  } = useUser();
  const { getEpicById, addEpicToFavorites, removeEpicFromFavorites, updateEpicDetails } = useEpic();
  // derived values
  const epicDetails = epicId ? getEpicById(epicId.toString()) : null;
  const isFavorite = !!epicDetails?.is_favorite;
  // permission
  const isEditingAllowed =
    allowPermissions([EUserPermissions.ADMIN, EUserPermissions.MEMBER], EUserPermissionsLevel.PROJECT) &&
    !epicDetails?.archived_at;
  // translation
  const { t } = useTranslation();

  const handleUpdateEpic = useCallback(
    async (formData: Partial<IEpic>) => {
      if (!workspaceSlug || !projectId || !epicDetails) return;
      await updateEpicDetails(workspaceSlug.toString(), projectId.toString(), epicDetails.id, formData).catch(
        () => {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Error!",
            message: "Epic could not be updated. Please try again.",
          });
        }
      );
    },
    [epicDetails, projectId, updateEpicDetails, workspaceSlug]
  );

  const handleUpdateMember = useCallback(
    (memberId: string) => {
      if (!epicDetails) return;

      const updatedMembers = epicDetails.member_ids ?? [];
      if (updatedMembers.includes(memberId)) updatedMembers.splice(updatedMembers.indexOf(memberId), 1);
      else updatedMembers.push(memberId);

      handleUpdateEpic({ member_ids: updatedMembers });
    },
    [handleUpdateEpic, epicDetails]
  );

  const toggleFavorite = useCallback(() => {
    if (!workspaceSlug || !epicDetails || !epicDetails.project_id) return;
    try {
      if (isFavorite) removeEpicFromFavorites(workspaceSlug.toString(), epicDetails.project_id, epicDetails.id);
      else addEpicToFavorites(workspaceSlug.toString(), epicDetails.project_id, epicDetails.id);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Some error occurred",
      });
    }
  }, [addEpicToFavorites, removeEpicFromFavorites, workspaceSlug, epicDetails, isFavorite]);

  const copyEpicUrlToClipboard = useCallback(() => {
    const url = new URL(window.location.href);
    copyTextToClipboard(url.href)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("power_k.contextual_actions.epic.copy_url_toast_success"),
        });
      })
      .catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("power_k.contextual_actions.epic.copy_url_toast_error"),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [
    {
      id: "add_remove_epic_members",
      i18n_title: "power_k.contextual_actions.epic.add_remove_members",
      icon: Users,
      group: "contextual",
      contextType: "epic",
      type: "change-page",
      page: "update-epic-member",
      onSelect: (data) => {
        const memberId = data as string;
        handleUpdateMember(memberId);
      },
      shortcut: "m",
      isEnabled: () => isEditingAllowed,
      isVisible: () => isEditingAllowed,
      closeOnSelect: false,
    },
    {
      id: "change_epic_status",
      i18n_title: "power_k.contextual_actions.epic.change_status",
      iconNode: <EpicStatusIcon status="backlog" className="shrink-0 size-3.5" />,
      group: "contextual",
      contextType: "epic",
      type: "change-page",
      page: "update-epic-status",
      onSelect: (data) => {
        const status = data as TEpicStatus;
        handleUpdateEpic({ status });
      },
      shortcut: "s",
      isEnabled: () => isEditingAllowed,
      isVisible: () => isEditingAllowed,
      closeOnSelect: true,
    },
    {
      id: "toggle_epic_favorite",
      i18n_title: isFavorite
        ? "power_k.contextual_actions.epic.remove_from_favorites"
        : "power_k.contextual_actions.epic.add_to_favorites",
      icon: isFavorite ? StarOff : Star,
      group: "contextual",
      contextType: "epic",
      type: "action",
      action: toggleFavorite,
      modifierShortcut: "shift+f",
      isEnabled: () => isEditingAllowed,
      isVisible: () => isEditingAllowed,
      closeOnSelect: true,
    },
    {
      id: "copy_epic_url",
      i18n_title: "power_k.contextual_actions.epic.copy_url",
      icon: LinkIcon,
      group: "contextual",
      contextType: "epic",
      type: "action",
      action: copyEpicUrlToClipboard,
      modifierShortcut: "cmd+shift+,",
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
  ];
};

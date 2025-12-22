import { useCallback } from "react";
import { useParams } from "next/navigation";
import { LinkIcon, Star, StarOff } from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import { copyTextToClipboard } from "@plane/utils";
// components
import type { TPowerKCommandConfig } from "@/components/power-k/core/types";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useUser } from "@/hooks/store/user";
import { useWorkspaceSprints, getSprintById } from "@/store/queries/sprint";

export const usePowerKSprintContextBasedActions = (): TPowerKCommandConfig[] => {
  // navigation
  const { workspaceSlug, sprintId } = useParams();
  // store
  const {
    permission: { allowPermissions },
  } = useUser();
  // Keep MobX favorites methods until TanStack Query mutations are available
  const { addSprintToFavorites, removeSprintFromFavorites } = useSprint();
  // queries
  const { data: sprints } = useWorkspaceSprints(workspaceSlug?.toString() ?? "");
  // derived values
  const sprintDetails = sprintId ? getSprintById(sprints, sprintId.toString()) : null;
  const isFavorite = !!sprintDetails?.is_favorite;
  // permission
  const isEditingAllowed =
    allowPermissions([EUserPermissions.ADMIN, EUserPermissions.MEMBER], EUserPermissionsLevel.PROJECT) &&
    !sprintDetails?.archived_at;
  // translation
  const { t } = useTranslation();

  const toggleFavorite = useCallback(() => {
    if (!workspaceSlug || !sprintDetails || !sprintDetails.project_id) return;
    try {
      if (isFavorite) removeSprintFromFavorites(workspaceSlug.toString(), sprintDetails.project_id, sprintDetails.id);
      else addSprintToFavorites(workspaceSlug.toString(), sprintDetails.project_id, sprintDetails.id);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Some error occurred",
      });
    }
  }, [addSprintToFavorites, removeSprintFromFavorites, workspaceSlug, sprintDetails, isFavorite]);

  const copySprintUrlToClipboard = useCallback(() => {
    const url = new URL(window.location.href);
    copyTextToClipboard(url.href)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("power_k.contextual_actions.sprint.copy_url_toast_success"),
        });
      })
      .catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("power_k.contextual_actions.sprint.copy_url_toast_error"),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [
    {
      id: "toggle_sprint_favorite",
      i18n_title: isFavorite
        ? "power_k.contextual_actions.sprint.remove_from_favorites"
        : "power_k.contextual_actions.sprint.add_to_favorites",
      icon: isFavorite ? StarOff : Star,
      group: "contextual",
      contextType: "sprint",
      type: "action",
      action: toggleFavorite,
      modifierShortcut: "shift+f",
      isEnabled: () => isEditingAllowed,
      isVisible: () => isEditingAllowed,
      closeOnSelect: true,
    },
    {
      id: "copy_sprint_url",
      i18n_title: "power_k.contextual_actions.sprint.copy_url",
      icon: LinkIcon,
      group: "contextual",
      contextType: "sprint",
      type: "action",
      action: copySprintUrlToClipboard,
      modifierShortcut: "cmd+shift+,",
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
  ];
};

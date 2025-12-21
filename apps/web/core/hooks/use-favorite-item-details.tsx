// plane imports
import type { IFavorite } from "@plane/types";
// components
import { getPageName } from "@plane/utils";
import {
  generateFavoriteItemLink,
  getFavoriteItemIcon,
} from "@/components/workspace/sidebar/favorites/favorite-items/common";
// helpers
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useEpic } from "@/hooks/store/use-epic";
import { useProject } from "@/hooks/store/use-project";
import { useProjectView } from "@/hooks/store/use-project-view";
// plane web hooks
import { EPageStoreType, usePage } from "@/plane-web/hooks/store";
import { useAdditionalFavoriteItemDetails } from "@/plane-web/hooks/use-additional-favorite-item-details";

export const useFavoriteItemDetails = (workspaceSlug: string, favorite: IFavorite) => {
  const {
    entity_identifier: favoriteItemId,
    entity_data: { logo_props: favoriteItemLogoProps },
    entity_type: favoriteItemEntityType,
  } = favorite;
  const favoriteItemName = favorite?.entity_data?.name || favorite?.name;
  // store hooks
  const { getViewById } = useProjectView();
  const { getProjectById } = useProject();
  const { getSprintById } = useSprint();
  const { getEpicById } = useEpic();
  // additional details
  const { getAdditionalFavoriteItemDetails } = useAdditionalFavoriteItemDetails();
  // derived values
  const pageDetail = usePage({
    pageId: favoriteItemId ?? "",
    storeType: EPageStoreType.PROJECT,
  });
  const viewDetails = getViewById(favoriteItemId ?? "");
  const sprintDetail = getSprintById(favoriteItemId ?? "");
  const moduleDetail = getEpicById(favoriteItemId ?? "");
  const currentProjectDetails = getProjectById(favorite.project_id ?? "");

  let itemIcon;
  let itemTitle;
  const itemLink = generateFavoriteItemLink(workspaceSlug.toString(), favorite);

  switch (favoriteItemEntityType) {
    case "project":
      itemTitle = currentProjectDetails?.name ?? favoriteItemName;
      itemIcon = getFavoriteItemIcon("project", currentProjectDetails?.logo_props || favoriteItemLogoProps);
      break;
    case "page":
      itemTitle = getPageName(pageDetail?.name ?? favoriteItemName);
      itemIcon = getFavoriteItemIcon("page", pageDetail?.logo_props ?? favoriteItemLogoProps);
      break;
    case "view":
      itemTitle = viewDetails?.name ?? favoriteItemName;
      itemIcon = getFavoriteItemIcon("view", viewDetails?.logo_props || favoriteItemLogoProps);
      break;
    case "sprint":
      itemTitle = sprintDetail?.name ?? favoriteItemName;
      itemIcon = getFavoriteItemIcon("sprint");
      break;
    case "epic":
      itemTitle = moduleDetail?.name ?? favoriteItemName;
      itemIcon = getFavoriteItemIcon("epic");
      break;
    default: {
      const additionalDetails = getAdditionalFavoriteItemDetails(workspaceSlug, favorite);
      itemTitle = additionalDetails.itemTitle;
      itemIcon = additionalDetails.itemIcon;
      break;
    }
  }

  return { itemIcon, itemTitle, itemLink };
};

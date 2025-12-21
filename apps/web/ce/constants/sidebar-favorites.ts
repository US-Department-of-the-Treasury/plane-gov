import type { LucideIcon } from "lucide-react";
// plane imports
import type { ISvgIcons } from "@plane/propel/icons";
import { SprintIcon, FavoriteFolderIcon, EpicIcon, PageIcon, ProjectIcon, ViewsIcon } from "@plane/propel/icons";
import type { IFavorite } from "@plane/types";

export const FAVORITE_ITEM_ICONS: Record<string, React.FC<ISvgIcons> | LucideIcon> = {
  page: PageIcon,
  project: ProjectIcon,
  view: ViewsIcon,
  epic: EpicIcon,
  sprint: SprintIcon,
  folder: FavoriteFolderIcon,
};

export const FAVORITE_ITEM_LINKS: {
  [key: string]: {
    itemLevel: "project" | "workspace";
    getLink: (favorite: IFavorite) => string;
  };
} = {
  project: {
    itemLevel: "project",
    getLink: () => `issues`,
  },
  sprint: {
    itemLevel: "project",
    getLink: (favorite) => `sprints/${favorite.entity_identifier}`,
  },
  epic: {
    itemLevel: "project",
    getLink: (favorite) => `epics/${favorite.entity_identifier}`,
  },
  view: {
    itemLevel: "project",
    getLink: (favorite) => `views/${favorite.entity_identifier}`,
  },
  page: {
    itemLevel: "project",
    getLink: (favorite) => `pages/${favorite.entity_identifier}`,
  },
};

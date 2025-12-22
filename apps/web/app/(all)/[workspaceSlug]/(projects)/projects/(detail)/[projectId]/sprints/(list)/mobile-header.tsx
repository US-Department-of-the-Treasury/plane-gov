import type React from "react";

import { useParams } from "next/navigation";
// ui
import type { ISvgIcons } from "@plane/propel/icons";
import { TimelineLayoutIcon, GridLayoutIcon, ListLayoutIcon } from "@plane/propel/icons";
// plane package imports
import type { TSprintLayoutOptions } from "@plane/types";
import { CustomMenu } from "@plane/ui";
// hooks
import { useSprintFilter } from "@/hooks/store/use-sprint-filter";
import { useProjectDetails } from "@/store/queries/project";

const SPRINT_VIEW_LAYOUTS: {
  key: TSprintLayoutOptions;
  icon: React.FC<ISvgIcons>;
  title: string;
}[] = [
  {
    key: "list",
    icon: ListLayoutIcon,
    title: "List layout",
  },
  {
    key: "board",
    icon: GridLayoutIcon,
    title: "Gallery layout",
  },
  {
    key: "gantt",
    icon: TimelineLayoutIcon,
    title: "Timeline layout",
  },
];

export function SprintsListMobileHeader() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // hooks
  const { data: currentProjectDetails } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  const { updateDisplayFilters } = useSprintFilter();
  return (
    <div className="flex justify-center sm:hidden">
      <CustomMenu
        maxHeight={"md"}
        className="flex flex-grow justify-center text-secondary text-13 py-2 border-b border-subtle bg-surface-1"
        // placement="bottom-start"
        customButton={
          <span className="flex items-center gap-2">
            <ListLayoutIcon className="h-4 w-4" />
            <span className="flex flex-grow justify-center text-secondary text-13">Layout</span>
          </span>
        }
        customButtonClassName="flex flex-grow justify-center items-center text-secondary text-13"
        closeOnSelect
      >
        {SPRINT_VIEW_LAYOUTS.map((layout) => {
          if (layout.key == "gantt") return;
          return (
            <CustomMenu.MenuItem
              key={layout.key}
              onClick={() => {
                if (currentProjectDetails) {
                  updateDisplayFilters(currentProjectDetails.id, {
                    layout: layout.key,
                  });
                }
              }}
              className="flex items-center gap-2"
            >
              <layout.icon className="w-3 h-3" />
              <div className="text-tertiary">{layout.title}</div>
            </CustomMenu.MenuItem>
          );
        })}
      </CustomMenu>
    </div>
  );
}

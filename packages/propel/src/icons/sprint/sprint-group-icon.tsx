import * as React from "react";
import { CircleDotDashed, Circle } from "lucide-react";

import { SprintIcon } from "../project/sprint-icon";
import { CircleDotFullIcon } from "./circle-dot-full-icon";
import type { ISprintGroupIcon } from "./helper";
import { CYCLE_GROUP_COLORS } from "./helper";

const iconComponents = {
  current: SprintIcon,
  upcoming: CircleDotDashed,
  completed: CircleDotFullIcon,
  draft: Circle,
};

export function SprintGroupIcon({
  className = "",
  color,
  sprintGroup,
  height = "12px",
  width = "12px",
}: ISprintGroupIcon) {
  const SprintIconComponent = iconComponents[sprintGroup] || SprintIcon;

  return (
    <SprintIconComponent
      height={height}
      width={width}
      color={color ?? CYCLE_GROUP_COLORS[sprintGroup]}
      className={`flex-shrink-0 ${className}`}
    />
  );
}

import type { FC } from "react";
import React from "react";
// types
import { SprintGroupIcon, ChevronDownIcon } from "@plane/propel/icons";
import type { TSprintGroups } from "@plane/types";
// icons
import { Row } from "@plane/ui";
// helpers
import { cn } from "@plane/utils";

type Props = {
  type: TSprintGroups;
  title: string;
  count?: number;
  showCount?: boolean;
  isExpanded?: boolean;
};

export function SprintListGroupHeader(props: Props) {
  const { type, title, count, showCount = false, isExpanded = false } = props;
  return (
    <Row className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-xs">
          <SprintGroupIcon sprintGroup={type} className="h-5 w-5" />
        </div>

        <div className="relative flex w-full flex-row items-center gap-1 overflow-hidden">
          <div className="inline-block line-clamp-1 truncate font-medium text-primary">{title}</div>
          {showCount && <div className="pl-2 text-13 font-medium text-tertiary">{`${count ?? "0"}`}</div>}
        </div>
      </div>
      <ChevronDownIcon
        className={cn("shrink-0 size-4 text-tertiary transition-transform", {
          "rotate-180": isExpanded,
        })}
      />
    </Row>
  );
}

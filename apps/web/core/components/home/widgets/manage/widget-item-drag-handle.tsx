import type { FC } from "react";
import React from "react";
// ui
import { DragHandle } from "@plane/ui";
// helper
import { cn } from "@plane/utils";

type Props = {
  sort_order: number | null;
  isDragging: boolean;
};

export function WidgetItemDragHandle(props: Props) {
  const { isDragging } = props;

  return (
    <div
      className={cn("flex items-center justify-center rounded-sm text-placeholder cursor-grab mr-2", {
        "cursor-grabbing": isDragging,
      })}
    >
      <DragHandle className="bg-transparent" />
    </div>
  );
}

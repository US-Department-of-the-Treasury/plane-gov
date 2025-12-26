import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../utils";

export type TPosition =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "auto"
  | "auto-end"
  | "auto-start"
  | "bottom-left"
  | "bottom-right"
  | "left-bottom"
  | "left-top"
  | "right-bottom"
  | "right-top"
  | "top-left"
  | "top-right";

type TSide = "top" | "bottom" | "left" | "right";
type TAlign = "start" | "center" | "end";

// Map Blueprint position names to Radix side/align
const POSITION_MAP: Record<TPosition, { side: TSide; align: TAlign }> = {
  top: { side: "top", align: "center" },
  bottom: { side: "bottom", align: "center" },
  left: { side: "left", align: "center" },
  right: { side: "right", align: "center" },
  auto: { side: "bottom", align: "center" },
  "auto-start": { side: "bottom", align: "start" },
  "auto-end": { side: "bottom", align: "end" },
  "top-left": { side: "top", align: "start" },
  "top-right": { side: "top", align: "end" },
  "bottom-left": { side: "bottom", align: "start" },
  "bottom-right": { side: "bottom", align: "end" },
  "left-top": { side: "left", align: "start" },
  "left-bottom": { side: "left", align: "end" },
  "right-top": { side: "right", align: "start" },
  "right-bottom": { side: "right", align: "end" },
};

interface ITooltipProps {
  tooltipHeading?: string;
  tooltipContent: string | React.ReactNode;
  position?: TPosition;
  children: React.ReactElement<Record<string, unknown>>;
  disabled?: boolean;
  className?: string;
  openDelay?: number;
  closeDelay?: number;
  isMobile?: boolean;
  renderByDefault?: boolean;
}

export function Tooltip({
  tooltipHeading,
  tooltipContent,
  position = "top",
  children,
  disabled = false,
  className = "",
  openDelay = 200,
  closeDelay,
  isMobile = false,
}: ITooltipProps) {
  const { side, align } = POSITION_MAP[position] || POSITION_MAP.top;

  if (disabled) {
    return children;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={openDelay} skipDelayDuration={closeDelay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(
              "relative block z-50 max-w-xs gap-1 overflow-hidden break-words rounded-md bg-surface-1 p-2 text-11 text-secondary shadow-md",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              {
                hidden: isMobile,
              },
              className
            )}
            side={side}
            sideOffset={4}
            align={align}
          >
            {tooltipHeading && <h5 className="font-medium text-primary">{tooltipHeading}</h5>}
            {tooltipContent}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

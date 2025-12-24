"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "../utils";

export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  /**
   * The orientation of the separator
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Whether the separator is purely decorative (ignored by screen readers)
   * @default true
   */
  decorative?: boolean;
}

/**
 * Radix-based Separator following shadcn/ui patterns.
 * Use this for visual dividers between content sections.
 *
 * @example
 * ```tsx
 * <div>
 *   <div>Content above</div>
 *   <Separator className="my-4" />
 *   <div>Content below</div>
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // Vertical separator
 * <div className="flex h-5 items-center space-x-4">
 *   <span>Item 1</span>
 *   <Separator orientation="vertical" />
 *   <span>Item 2</span>
 * </div>
 * ```
 */
const Separator = React.forwardRef<React.ElementRef<typeof SeparatorPrimitive.Root>, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      data-slot="separator"
      className={cn(
        "shrink-0 bg-subtle",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
);

Separator.displayName = "Separator";

export { Separator };

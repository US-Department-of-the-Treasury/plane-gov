import type * as React from "react";
import { cva  } from "class-variance-authority";
import type {VariantProps} from "class-variance-authority";

export const loaderVariants = cva("flex items-center justify-center", {
  variants: {
    variant: {
      /** Inline loader for buttons or small areas */
      inline: "gap-2",
      /** Centered loader for content areas */
      centered: "flex-col gap-3 p-6",
      /** Full-page overlay loader */
      fullscreen: "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex-col gap-4",
      /** Overlay for a container */
      overlay: "absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex-col gap-3",
    },
    size: {
      sm: "",
      default: "",
      lg: "",
    },
  },
  defaultVariants: {
    variant: "centered",
    size: "default",
  },
  compoundVariants: [
    { variant: "inline", size: "sm", class: "text-xs" },
    { variant: "inline", size: "default", class: "text-sm" },
    { variant: "inline", size: "lg", class: "text-base" },
    { variant: "centered", size: "sm", class: "text-sm" },
    { variant: "centered", size: "default", class: "text-base" },
    { variant: "centered", size: "lg", class: "text-lg" },
    { variant: "fullscreen", size: "sm", class: "text-sm" },
    { variant: "fullscreen", size: "default", class: "text-lg" },
    { variant: "fullscreen", size: "lg", class: "text-xl" },
    { variant: "overlay", size: "sm", class: "text-sm" },
    { variant: "overlay", size: "default", class: "text-base" },
    { variant: "overlay", size: "lg", class: "text-lg" },
  ],
});

export const spinnerSizeMap = {
  inline: { sm: "xs" as const, default: "sm" as const, lg: "default" as const },
  centered: { sm: "sm" as const, default: "default" as const, lg: "lg" as const },
  fullscreen: { sm: "default" as const, default: "lg" as const, lg: "xl" as const },
  overlay: { sm: "sm" as const, default: "default" as const, lg: "lg" as const },
};

export type LoaderProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof loaderVariants> & {
    /** Text to display below the spinner */
    text?: string;
    /** Custom spinner element */
    spinner?: React.ReactNode;
    /** Whether the loader is visible (for conditional rendering) */
    loading?: boolean;
  };

import type * as React from "react";
import { cva  } from "class-variance-authority";
import type {VariantProps} from "class-variance-authority";

export const spinnerVariants = cva("animate-spin text-secondary", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-4",
      default: "size-6",
      lg: "size-8",
      xl: "size-12",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export type SpinnerProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof spinnerVariants> & {
    /** @deprecated Use size variant instead */
    height?: string;
    /** @deprecated Use size variant instead */
    width?: string;
  };

/** @deprecated Use Spinner with size variant instead */
export interface ISpinner extends React.SVGAttributes<SVGElement> {
  height?: string;
  width?: string;
  className?: string | undefined;
}

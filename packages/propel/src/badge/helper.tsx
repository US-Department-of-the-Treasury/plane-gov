import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Filled variants (original)
        neutral: "bg-layer-3 text-tertiary",
        brand: "bg-accent-subtle-hover text-accent-primary",
        warning: "bg-warning-subtle text-warning",
        success: "bg-success-subtle-1 text-success",
        danger: "bg-danger-subtle text-danger",
        // shadcn-inspired variants
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-subtle text-primary bg-transparent",
      },
      size: {
        sm: "h-4 px-1 text-caption-sm-medium rounded-sm",
        base: "h-5 px-1.5 text-caption-sm-medium rounded-md",
        lg: "h-6 px-2 text-caption-md-medium rounded-md",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "base",
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    appendIcon?: React.ReactElement<{ className?: string; strokeWidth?: number }>;
    prependIcon?: React.ReactElement<{ className?: string; strokeWidth?: number }>;
  };

export type TBadgeVariant = NonNullable<BadgeProps["variant"]>;
export type TBadgeSize = NonNullable<BadgeProps["size"]>;

const badgeIconStyling: Record<TBadgeSize, string> = {
  sm: "size-3.5",
  base: "size-3.5",
  lg: "size-4",
};

export function getBadgeIconStyling(size: TBadgeSize): string {
  return badgeIconStyling[size];
}

export function getBadgeStyling(variant: TBadgeVariant, size: TBadgeSize): string {
  return badgeVariants({ variant, size });
}

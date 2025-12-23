import React, { useMemo } from "react";
import Link from "next/link";
import { cn } from "@plane/utils";
import { Tooltip } from "@plane/ui";

// ============================================================================
// TYPES
// ============================================================================

interface AppSidebarItemData {
  href?: string;
  label?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  showLabel?: boolean;
  /** Keyboard shortcut number (e.g., 1, 2, 3) for display in tooltip */
  shortcutKey?: number;
}

interface AppSidebarItemProps {
  variant?: "link" | "button";
  item?: AppSidebarItemData;
}

interface AppSidebarItemLabelProps {
  highlight?: boolean;
  label?: string;
}

interface AppSidebarItemIconProps {
  icon?: React.ReactNode;
  highlight?: boolean;
}

interface AppSidebarLinkItemProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  /** Whether this link is currently active */
  isActive?: boolean;
}

interface AppSidebarButtonItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  base: "group flex flex-col gap-0.5 items-center justify-center text-tertiary",
  icon: "flex items-center justify-center gap-2 size-8 rounded-md text-tertiary",
  iconActive: "bg-layer-transparent-selected text-secondary !text-icon-primary",
  iconInactive: "group-hover:text-icon-secondary group-hover:bg-layer-transparent-hover !text-icon-tertiary",
  label: "text-11 font-medium",
  labelActive: "text-secondary",
  labelInactive: "group-hover:text-secondary text-tertiary",
} as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function AppSidebarItemLabel({ highlight = false, label }: AppSidebarItemLabelProps) {
  if (!label) return null;

  return (
    <span
      className={cn(styles.label, {
        [styles.labelActive]: highlight,
        [styles.labelInactive]: !highlight,
      })}
    >
      {label}
    </span>
  );
}

function AppSidebarItemIcon({ icon, highlight }: AppSidebarItemIconProps) {
  if (!icon) return null;

  return (
    <div
      className={cn(styles.icon, {
        [styles.iconActive]: highlight,
        [styles.iconInactive]: !highlight,
      })}
    >
      {icon}
    </div>
  );
}

function AppSidebarLinkItem({
  href,
  children,
  className,
  isActive,
}: AppSidebarLinkItemProps & { ref?: React.Ref<HTMLAnchorElement> }) {
  if (!href) return null;

  // Note: ref is not forwarded because the compat Link (React Router) handles refs internally
  return (
    <Link href={href} className={cn(styles.base, className)} data-active={isActive || undefined}>
      {children}
    </Link>
  );
}

// Note: Using div instead of button because this component is typically nested
// inside CustomMenu which wraps it in its own button element. Using a button here
// would create invalid HTML (button inside button).
function AppSidebarButtonItem({
  children,
  onClick,
  disabled = false,
  className,
  ref,
}: AppSidebarButtonItemProps & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(styles.base, disabled && "opacity-50 cursor-not-allowed", className)}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export type AppSidebarItemComponent = React.FC<AppSidebarItemProps & { ref?: React.Ref<HTMLElement> }> & {
  Label: React.FC<AppSidebarItemLabelProps>;
  Icon: React.FC<AppSidebarItemIconProps>;
  Link: React.FC<AppSidebarLinkItemProps & { ref?: React.Ref<HTMLAnchorElement> }>;
  Button: React.FC<AppSidebarButtonItemProps & { ref?: React.Ref<HTMLDivElement> }>;
};

/**
 * Formats keyboard shortcut for display based on platform
 * @param shortcutKey - The number key (1, 2, 3, etc.)
 * @returns Formatted string like "⌘1" or "Ctrl+1"
 */
function formatShortcut(shortcutKey: number): string {
  // Check for Mac using navigator (SSR-safe)
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  return isMac ? `⌘${shortcutKey}` : `Ctrl+${shortcutKey}`;
}

const AppSidebarItem = function AppSidebarItem({
  variant = "link",
  item,
  ref,
}: AppSidebarItemProps & { ref?: React.Ref<HTMLElement> }) {
  // Extract item properties with defaults (hooks must be called before early return)
  const { icon, isActive, label, href, onClick, disabled, showLabel = true, shortcutKey } = item ?? {};

  // Memoize the tooltip content to avoid recalculating on each render
  const tooltipContent = useMemo(() => {
    if (!label) return null;
    if (shortcutKey) {
      return (
        <span className="flex items-center gap-2">
          <span>{label}</span>
          <span className="text-custom-text-400 text-10 font-mono">{formatShortcut(shortcutKey)}</span>
        </span>
      );
    }
    return label;
  }, [label, shortcutKey]);

  // Early return after hooks
  if (!item) return null;

  const commonItems = (
    <>
      <AppSidebarItemIcon icon={icon} highlight={isActive} />
      {showLabel && <AppSidebarItemLabel highlight={isActive} label={label} />}
    </>
  );

  const linkElement = (
    <AppSidebarLinkItem ref={ref as React.Ref<HTMLAnchorElement>} href={href} isActive={isActive}>
      {commonItems}
    </AppSidebarLinkItem>
  );

  const buttonElement = (
    <AppSidebarButtonItem ref={ref as React.Ref<HTMLDivElement>} onClick={onClick} disabled={disabled}>
      {commonItems}
    </AppSidebarButtonItem>
  );

  const content = variant === "link" ? linkElement : buttonElement;

  // Show tooltip with shortcut hint when label is hidden (icon-only mode)
  if (!showLabel && tooltipContent) {
    return (
      <Tooltip tooltipContent={tooltipContent} position="right">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {content as any}
      </Tooltip>
    );
  }

  return content;
} as AppSidebarItemComponent;

// ============================================================================
// COMPOUND COMPONENT ASSIGNMENT
// ============================================================================

AppSidebarItem.Label = AppSidebarItemLabel;
AppSidebarItem.Icon = AppSidebarItemIcon;
AppSidebarItem.Link = AppSidebarLinkItem;
AppSidebarItem.Button = AppSidebarButtonItem;

export { AppSidebarItem };
export type { AppSidebarItemData, AppSidebarItemProps };

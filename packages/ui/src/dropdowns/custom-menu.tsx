"use client";

import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@plane/propel/icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@plane/propel/primitives";
// helpers
import { cn } from "../utils";
// types
import type {
  ICustomMenuDropdownProps,
  ICustomMenuItemProps,
  ICustomSubMenuProps,
  ICustomSubMenuTriggerProps,
  ICustomSubMenuContentProps,
} from "./helper";

// Map placement from our API to Radix side/align
function mapPlacementToRadix(placement?: string): { side?: "top" | "bottom" | "left" | "right"; align?: "start" | "center" | "end" } {
  if (!placement) return { side: "bottom", align: "start" };

  const [side, align] = placement.split("-") as [string, string | undefined];

  const sideMap: Record<string, "top" | "bottom" | "left" | "right"> = {
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
  };

  const alignMap: Record<string, "start" | "center" | "end"> = {
    start: "start",
    end: "end",
    center: "center",
  };

  return {
    side: sideMap[side] ?? "bottom",
    align: align ? alignMap[align] : "start",
  };
}

function CustomMenu(props: ICustomMenuDropdownProps) {
  const {
    ariaLabel,
    buttonClassName = "",
    customButtonClassName = "",
    customButtonTabIndex = 0,
    placement,
    children,
    className = "",
    customButton,
    disabled = false,
    ellipsis = false,
    label,
    maxHeight = "md",
    noBorder = false,
    noChevron = false,
    optionsClassName = "",
    menuItemsClassName = "",
    verticalEllipsis = false,
    portalElement,
    menuButtonOnClick,
    onMenuClose,
    tabIndex,
    closeOnSelect,
  } = props;

  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && onMenuClose) {
      onMenuClose();
    }
  };

  const { side, align } = mapPlacementToRadix(placement);

  const triggerButton = customButton ? (
    <div
      role="button"
      className={cn("grid place-items-center", customButtonClassName)}
      tabIndex={customButtonTabIndex}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => {
        if (menuButtonOnClick) menuButtonOnClick();
      }}
    >
      {customButton}
    </div>
  ) : ellipsis || verticalEllipsis ? (
    <button
      type="button"
      disabled={disabled}
      className={`relative grid place-items-center rounded-sm p-1 text-secondary outline-none hover:text-primary ${
        disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-layer-transparent-hover"
      } ${buttonClassName}`}
      tabIndex={customButtonTabIndex}
      aria-label={ariaLabel}
      onClick={() => {
        if (menuButtonOnClick) menuButtonOnClick();
      }}
    >
      <MoreHorizontal className={`h-3.5 w-3.5 ${verticalEllipsis ? "rotate-90" : ""}`} />
    </button>
  ) : (
    <button
      type="button"
      className={`flex items-center justify-between gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-11 duration-300 ${
        isOpen ? "text-primary" : "text-secondary"
      } ${noBorder ? "" : "border border-strong shadow-sm focus:outline-none"} ${
        disabled ? "cursor-not-allowed text-secondary" : "cursor-pointer hover:bg-layer-transparent-hover"
      } ${buttonClassName}`}
      tabIndex={customButtonTabIndex}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => {
        if (menuButtonOnClick) menuButtonOnClick();
      }}
    >
      {label}
      {!noChevron && <ChevronDownIcon className="h-3.5 w-3.5" />}
    </button>
  );

  const menuContent = (
    <DropdownMenuContent
      side={side}
      align={align}
      sideOffset={4}
      className={cn(
        "z-50 min-w-[12rem] rounded-md border-[0.5px] border-subtle-1 bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200",
        menuItemsClassName
      )}
      onCloseAutoFocus={(e: Event) => e.preventDefault()}
    >
      <div
        className={cn(
          "space-y-0.5 overflow-y-auto whitespace-nowrap",
          {
            "max-h-60": maxHeight === "lg",
            "max-h-48": maxHeight === "md",
            "max-h-36": maxHeight === "rg",
            "max-h-28": maxHeight === "sm",
          },
          optionsClassName
        )}
      >
        <MenuContext.Provider value={{ closeOnSelect: closeOnSelect ?? false, closeMenu: () => setIsOpen(false) }}>
          {children}
        </MenuContext.Provider>
      </div>
    </DropdownMenuContent>
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        asChild
        disabled={disabled}
        tabIndex={tabIndex}
        className={cn("relative w-min text-left outline-none", className)}
      >
        {triggerButton}
      </DropdownMenuTrigger>
      {portalElement ? (
        <DropdownMenuPortal container={portalElement}>
          {menuContent}
        </DropdownMenuPortal>
      ) : (
        menuContent
      )}
    </DropdownMenu>
  );
}

// Context for menu items to access close behavior
const MenuContext = React.createContext<{
  closeOnSelect: boolean;
  closeMenu: () => void;
}>({
  closeOnSelect: false,
  closeMenu: () => {},
});

function MenuItem(props: ICustomMenuItemProps) {
  const { children, disabled = false, onClick, className } = props;
  const { closeOnSelect, closeMenu } = React.useContext(MenuContext);

  return (
    <DropdownMenuItem
      disabled={disabled}
      className={cn(
        "w-full select-none truncate rounded-sm px-1 py-1.5 text-left text-secondary cursor-pointer outline-none",
        "focus:bg-layer-transparent-hover data-[highlighted]:bg-layer-transparent-hover",
        {
          "text-placeholder cursor-not-allowed": disabled,
        },
        className
      )}
      onSelect={(e: Event) => {
        if (!closeOnSelect) {
          e.preventDefault();
        }
        onClick?.(e);
      }}
    >
      {children}
    </DropdownMenuItem>
  );
}

// SubMenu implementation using Radix DropdownMenuSub
function SubMenu(props: ICustomSubMenuProps) {
  const {
    children,
    trigger,
    disabled = false,
    className = "",
    contentClassName = "",
    placement = "right-start",
  } = props;

  const { side, align } = mapPlacementToRadix(placement);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        disabled={disabled}
        className={cn(
          "w-full select-none rounded-sm px-1 py-1.5 text-left text-secondary flex items-center justify-between cursor-pointer outline-none",
          "focus:bg-layer-transparent-hover data-[highlighted]:bg-layer-transparent-hover data-[state=open]:bg-layer-transparent-hover",
          {
            "text-placeholder cursor-not-allowed": disabled,
          },
          className
        )}
      >
        <span className="flex-1">{trigger}</span>
        <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 ml-auto" />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        sideOffset={4}
        alignOffset={-4}
        className={cn(
          "z-50 min-w-[12rem] overflow-hidden rounded-md border-[0.5px] border-subtle-1 bg-surface-1 p-1 text-11 shadow-raised-200",
          contentClassName
        )}
      >
        {children}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function SubMenuTrigger(props: ICustomSubMenuTriggerProps) {
  const { children, disabled = false, className } = props;

  // This is kept for backwards compatibility but SubMenu handles the trigger internally now
  return (
    <div
      className={cn(
        "w-full select-none rounded-sm px-1 py-1.5 text-left text-secondary flex items-center justify-between",
        {
          "cursor-pointer": !disabled,
          "text-placeholder cursor-not-allowed": disabled,
        },
        className
      )}
    >
      <span className="flex-1">{children}</span>
      <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0" />
    </div>
  );
}

function SubMenuContent(props: ICustomSubMenuContentProps) {
  const { children, className } = props;

  // This is kept for backwards compatibility but SubMenu handles the content internally now
  return (
    <div
      className={cn(
        "z-[15] min-w-[12rem] overflow-hidden rounded-md border border-subtle-1 bg-surface-1 p-1 text-11",
        className
      )}
    >
      {children}
    </div>
  );
}

// Portal component for backwards compatibility
interface PortalProps {
  children: React.ReactNode;
  container?: Element | null;
  asChild?: boolean;
}

function Portal({ children, container }: PortalProps) {
  // Radix handles portals internally, this is kept for backwards compatibility
  return <>{children}</>;
}

// Add all components as static properties for external use
CustomMenu.Portal = Portal;
CustomMenu.MenuItem = MenuItem;
CustomMenu.SubMenu = SubMenu;
CustomMenu.SubMenuTrigger = SubMenuTrigger;
CustomMenu.SubMenuContent = SubMenuContent;

export { CustomMenu };

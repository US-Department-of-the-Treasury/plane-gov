import type { ICustomSearchSelectOption } from "@plane/types";

type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

export interface IDropdownProps {
  customButtonClassName?: string;
  customButtonTabIndex?: number;
  buttonClassName?: string;
  className?: string;
  customButton?: React.ReactNode;
  disabled?: boolean;
  input?: boolean;
  label?: string | React.ReactNode;
  maxHeight?: "sm" | "rg" | "md" | "lg" | "xl" | "2xl";
  noChevron?: boolean;
  chevronClassName?: string;
  onOpen?: () => void;
  optionsClassName?: string;
  placement?: Placement;
  tabIndex?: number;
  useCaptureForOutsideClick?: boolean;
  defaultOpen?: boolean;
}

export interface IPortalProps {
  children: React.ReactNode;
  container?: Element | null;
  asChild?: boolean;
}

export interface ICustomMenuDropdownProps extends IDropdownProps {
  children: React.ReactNode;
  ellipsis?: boolean;
  noBorder?: boolean;
  verticalEllipsis?: boolean;
  menuButtonOnClick?: (...args: unknown[]) => void;
  menuItemsClassName?: string;
  onMenuClose?: () => void;
  closeOnSelect?: boolean;
  portalElement?: Element | null;
  openOnHover?: boolean;
  ariaLabel?: string;
}

export interface ICustomSelectProps<T = unknown> extends IDropdownProps {
  children: React.ReactNode;
  value: T;
  onChange: ((value: T) => void) | undefined;
}

interface CustomSearchSelectProps<T = unknown> {
  footerOption?: React.ReactNode;
  onChange: (value: T) => void;
  onClose?: () => void;
  noResultsMessage?: string;
  options?: ICustomSearchSelectOption[];
}

interface SingleValueProps<T = unknown> {
  multiple?: false;
  value: T;
}

interface MultipleValuesProps<T = unknown> {
  multiple?: true;
  value: T[] | null;
}

export type ICustomSearchSelectProps = IDropdownProps &
  CustomSearchSelectProps &
  (SingleValueProps | MultipleValuesProps);

export interface ICustomMenuItemProps {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: (args?: unknown) => void;
  className?: string;
}

export interface ICustomSelectItemProps<T = unknown> {
  children: React.ReactNode;
  value: T;
  className?: string;
}

// Submenu interfaces
export interface ICustomSubMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  placement?: Placement;
}

export interface ICustomSubMenuTriggerProps {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface ICustomSubMenuContentProps {
  children: React.ReactNode;
  className?: string;
  placement?: Placement;
  sideOffset?: number;
  alignOffset?: number;
}

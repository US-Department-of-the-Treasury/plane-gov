import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "../utils/classname";

// =============================================================================
// Types
// =============================================================================

type TMaxHeight = "lg" | "md" | "rg" | "sm";

interface SelectComboboxContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string | string[] | null;
  onValueChange: (value: string | string[] | null) => void;
  multiple: boolean;
  disabled: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SelectComboboxContext = React.createContext<SelectComboboxContextValue | null>(null);

function useSelectCombobox() {
  const context = React.useContext(SelectComboboxContext);
  if (!context) {
    throw new Error("SelectCombobox components must be used within a SelectCombobox.Root");
  }
  return context;
}

// =============================================================================
// Root Component
// =============================================================================

interface SelectComboboxRootProps {
  value?: string | string[] | null;
  defaultValue?: string | string[] | null;
  onValueChange?: (value: string | string[] | null) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  multiple?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function SelectComboboxRoot({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  multiple = false,
  disabled = false,
  children,
}: SelectComboboxRootProps) {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = React.useState<string | string[] | null>(
    defaultValue ?? (multiple ? [] : null)
  );
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Determine if controlled or uncontrolled
  const isValueControlled = controlledValue !== undefined;
  const isOpenControlled = controlledOpen !== undefined;

  const value = isValueControlled ? controlledValue : internalValue;
  const open = isOpenControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isOpenControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
      // Clear search when closing
      if (!newOpen) {
        setSearchQuery("");
      }
    },
    [isOpenControlled, onOpenChange]
  );

  const handleValueChange = React.useCallback(
    (newValue: string | string[] | null) => {
      if (!isValueControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isValueControlled, onValueChange]
  );

  const contextValue = React.useMemo(
    () => ({
      open,
      setOpen,
      value,
      onValueChange: handleValueChange,
      multiple,
      disabled,
      searchQuery,
      setSearchQuery,
    }),
    [open, setOpen, value, handleValueChange, multiple, disabled, searchQuery]
  );

  return (
    <SelectComboboxContext.Provider value={contextValue}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </PopoverPrimitive.Root>
    </SelectComboboxContext.Provider>
  );
}

// =============================================================================
// Trigger Component
// =============================================================================

interface SelectComboboxTriggerProps {
  children?: React.ReactNode;
  className?: string;
  placeholder?: string;
  /** Use default styling (border, padding, chevron). Set to false for custom buttons. */
  useDefaultStyle?: boolean;
}

const SelectComboboxTrigger = React.forwardRef<HTMLButtonElement, SelectComboboxTriggerProps>(
  function SelectComboboxTrigger({ children, className, placeholder, useDefaultStyle = false }, ref) {
    const { disabled } = useSelectCombobox();

    // When using default style, render with standard combobox styling
    if (useDefaultStyle) {
      return (
        <PopoverPrimitive.Trigger
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 shadow-sm",
            "hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="truncate">{children ?? placeholder ?? "Select..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverPrimitive.Trigger>
      );
    }

    // When not using default style, render children directly as the trigger content
    // This allows full customization of the trigger button
    return (
      <PopoverPrimitive.Trigger ref={ref} disabled={disabled} asChild className={className}>
        <div role="button" tabIndex={disabled ? -1 : 0} className="outline-none">
          {children}
        </div>
      </PopoverPrimitive.Trigger>
    );
  }
);

// =============================================================================
// Content Component
// =============================================================================

interface SelectComboboxContentProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: TMaxHeight;
  searchPlaceholder?: string;
  emptyMessage?: string;
  showSearch?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  width?: "trigger" | "auto" | number;
}

const MAX_HEIGHT_CLASSES: Record<TMaxHeight, string> = {
  lg: "max-h-60",
  md: "max-h-48",
  rg: "max-h-36",
  sm: "max-h-28",
} as const;

function SelectComboboxContent({
  children,
  className,
  maxHeight = "lg",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  showSearch = true,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  width = "trigger",
}: SelectComboboxContentProps) {
  const { searchQuery, setSearchQuery, setOpen } = useSelectCombobox();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      // Close on escape
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [setOpen]
  );

  const widthClass = width === "trigger" ? "w-[var(--radix-popover-trigger-width)]" : width === "auto" ? "" : "";
  const widthStyle = typeof width === "number" ? { width: `${width}px` } : undefined;

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        side={side}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 rounded-md border border-subtle bg-surface-1 p-1 shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          widthClass,
          className
        )}
        style={widthStyle}
        onOpenAutoFocus={(e) => {
          // Focus the search input instead of letting Radix auto-focus
          e.preventDefault();
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }}
      >
        <CommandPrimitive onKeyDown={handleKeyDown} shouldFilter={false}>
          {showSearch && (
            <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2 mb-1">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-placeholder" strokeWidth={1.5} />
              <CommandPrimitive.Input
                ref={inputRef}
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent py-1.5 text-13 text-secondary placeholder:text-placeholder focus:outline-none"
              />
            </div>
          )}
          <CommandPrimitive.List className={cn("overflow-y-auto overflow-x-hidden", MAX_HEIGHT_CLASSES[maxHeight])}>
            <CommandPrimitive.Empty className="px-2 py-6 text-center text-13 text-placeholder">
              {emptyMessage}
            </CommandPrimitive.Empty>
            {children}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

// =============================================================================
// Item Component
// =============================================================================

interface SelectComboboxItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  keywords?: string[];
  onSelect?: (value: string) => void;
}

function SelectComboboxItem({
  value: itemValue,
  children,
  disabled = false,
  className,
  keywords,
  onSelect,
}: SelectComboboxItemProps) {
  const { value, onValueChange, multiple, setOpen, searchQuery } = useSelectCombobox();

  // Check if this item is selected
  const isSelected = React.useMemo(() => {
    if (value === null) return false;
    if (Array.isArray(value)) {
      return value.includes(itemValue);
    }
    return value === itemValue;
  }, [value, itemValue]);

  // Filter based on search query
  const isVisible = React.useMemo(() => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();

    // Check keywords
    if (keywords?.some((k) => k.toLowerCase().includes(searchLower))) {
      return true;
    }

    // Check item value
    if (itemValue.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Check children text content
    const getTextContent = (node: React.ReactNode): string => {
      if (typeof node === "string") return node;
      if (typeof node === "number") return String(node);
      if (React.isValidElement(node)) {
        const nodeProps = node.props as { children?: React.ReactNode };
        if (nodeProps.children) {
          return getTextContent(nodeProps.children);
        }
      }
      if (Array.isArray(node)) {
        return node.map(getTextContent).join(" ");
      }
      return "";
    };

    const textContent = getTextContent(children);
    return textContent.toLowerCase().includes(searchLower);
  }, [searchQuery, keywords, itemValue, children]);

  if (!isVisible) return null;

  const handleSelect = () => {
    if (disabled) return;

    if (multiple) {
      // Toggle in array
      const currentValues = Array.isArray(value) ? value : [];
      if (isSelected) {
        onValueChange(currentValues.filter((v) => v !== itemValue));
      } else {
        onValueChange([...currentValues, itemValue]);
      }
    } else {
      // Single select - toggle or close
      if (isSelected) {
        onValueChange(null);
      } else {
        onValueChange(itemValue);
      }
      setOpen(false);
    }

    onSelect?.(itemValue);
  };

  return (
    <CommandPrimitive.Item
      value={itemValue}
      disabled={disabled}
      onSelect={handleSelect}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-13 outline-none",
        "data-[selected=true]:bg-layer-transparent-hover",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        isSelected && "text-primary",
        className
      )}
    >
      <span className="flex-1 truncate">{children}</span>
      {isSelected && <Check className="ml-2 h-4 w-4 flex-shrink-0" />}
    </CommandPrimitive.Item>
  );
}

// =============================================================================
// Group Component (optional)
// =============================================================================

interface SelectComboboxGroupProps {
  children: React.ReactNode;
  heading?: string;
  className?: string;
}

function SelectComboboxGroup({ children, heading, className }: SelectComboboxGroupProps) {
  return (
    <CommandPrimitive.Group heading={heading} className={cn("overflow-hidden", className)}>
      {heading && <div className="px-2 py-1.5 text-11 font-medium text-placeholder">{heading}</div>}
      {children}
    </CommandPrimitive.Group>
  );
}

// =============================================================================
// Separator Component
// =============================================================================

function SelectComboboxSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}

// =============================================================================
// Compound Export
// =============================================================================

const SelectCombobox = Object.assign(SelectComboboxRoot, {
  Trigger: SelectComboboxTrigger,
  Content: SelectComboboxContent,
  Item: SelectComboboxItem,
  Group: SelectComboboxGroup,
  Separator: SelectComboboxSeparator,
});

export { SelectCombobox };
export type {
  SelectComboboxRootProps,
  SelectComboboxTriggerProps,
  SelectComboboxContentProps,
  SelectComboboxItemProps,
  SelectComboboxGroupProps,
};

"use client";

/**
 * RadixComboBox - Radix-based ComboBox primitives
 *
 * This provides Radix-based alternatives to the HeadlessUI Combobox primitives.
 * It's designed to support a similar API to ease migration from HeadlessUI.
 *
 * Components:
 * - RadixComboDropDown: Main wrapper providing context and trigger button
 * - RadixComboOptions: Dropdown content wrapper (uses Radix Popover internally)
 * - RadixComboInput: Search input wrapper (uses CommandInput)
 * - RadixComboOption: Option item with render prop support ({ active, selected })
 *
 * Migration from HeadlessUI:
 * - Replace ComboDropDown with RadixComboDropDown
 * - Replace Combobox.Options with RadixComboOptions
 * - Replace Combobox.Input with RadixComboInput
 * - Replace Combobox.Option with RadixComboOption
 */

import type { ElementType, KeyboardEventHandler, ReactNode, Ref } from "react";
import React, { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Placement } from "@popperjs/core";
import { Command, CommandInput, CommandList, CommandItem } from "@plane/propel/primitives";
import { cn } from "../utils";

// ============================================================================
// Context
// ============================================================================

interface ComboContextValue {
  // Open state
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  // Selection
  value: string | string[] | null | undefined;
  onChange: (value: unknown) => void;
  multiple: boolean;
  // Query state for filtering
  query: string;
  setQuery: (query: string) => void;
  // Disabled state
  disabled: boolean;
}

const ComboContext = createContext<ComboContextValue | null>(null);

function useComboContext() {
  const ctx = useContext(ComboContext);
  if (!ctx) {
    throw new Error("RadixCombo components must be used within RadixComboDropDown");
  }
  return ctx;
}

// ============================================================================
// RadixComboDropDown - Main wrapper using Radix Popover
// ============================================================================

type RadixComboDropDownProps = {
  as?: ElementType | undefined;
  ref?: Ref<HTMLElement> | undefined;
  tabIndex?: number | undefined;
  className?: string | ((isOpen: boolean) => string) | undefined;
  value?: string | string[] | null;
  onChange?: (value: unknown) => void;
  disabled?: boolean | undefined;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement> | undefined;
  multiple?: boolean;
  renderByDefault?: boolean;
  button: ReactNode;
  children: ReactNode;
  /** If true, the dropdown manages its own open state based on button clicks */
  autoOpen?: boolean;
};

const RadixComboDropDown = forwardRef<HTMLDivElement, RadixComboDropDownProps>(function RadixComboDropDown(props, ref) {
  const {
    as: Component = "div",
    button,
    renderByDefault = true,
    children,
    value,
    onChange = () => {},
    disabled = false,
    multiple = false,
    onKeyDown,
    tabIndex,
    className,
    autoOpen: _autoOpen = false,
    ...rest
  } = props;

  const dropDownButtonRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(renderByDefault);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const onHover = useCallback(() => {
    setShouldRender(true);
  }, []);

  useEffect(() => {
    const element = dropDownButtonRef.current;

    if (!element) return;

    element.addEventListener("mouseenter", onHover);

    return () => {
      element?.removeEventListener("mouseenter", onHover);
    };
  }, [onHover]);

  // Wrapped setIsOpen that also clears query
  const handleSetIsOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setQuery("");
    }
  }, []);

  const contextValue: ComboContextValue = {
    isOpen,
    setIsOpen: handleSetIsOpen,
    value,
    onChange,
    multiple,
    query,
    setQuery,
    disabled,
  };

  const resolvedClassName = typeof className === "function" ? className(isOpen) : className;

  if (!shouldRender) {
    return (
      <div ref={dropDownButtonRef} className="h-full flex items-center" onMouseEnter={onHover}>
        {button}
      </div>
    );
  }

  return (
    <ComboContext.Provider value={contextValue}>
      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleSetIsOpen}>
        <Component {...rest} ref={ref} className={resolvedClassName} tabIndex={tabIndex} onKeyDown={onKeyDown}>
          <PopoverPrimitive.Trigger ref={dropDownButtonRef} asChild disabled={disabled}>
            {button}
          </PopoverPrimitive.Trigger>
          {children}
        </Component>
      </PopoverPrimitive.Root>
    </ComboContext.Provider>
  );
});

RadixComboDropDown.displayName = "RadixComboDropDown";

// ============================================================================
// RadixComboOptions - Dropdown content wrapper using Radix Popover
// ============================================================================

// Map popper.js placement to Radix side/align
function mapPlacementToRadix(placement: Placement): {
  side: "top" | "bottom" | "left" | "right";
  align: "start" | "center" | "end";
} {
  const mappings: Record<string, { side: "top" | "bottom" | "left" | "right"; align: "start" | "center" | "end" }> = {
    top: { side: "top", align: "center" },
    "top-start": { side: "top", align: "start" },
    "top-end": { side: "top", align: "end" },
    bottom: { side: "bottom", align: "center" },
    "bottom-start": { side: "bottom", align: "start" },
    "bottom-end": { side: "bottom", align: "end" },
    left: { side: "left", align: "center" },
    "left-start": { side: "left", align: "start" },
    "left-end": { side: "left", align: "end" },
    right: { side: "right", align: "center" },
    "right-start": { side: "right", align: "start" },
    "right-end": { side: "right", align: "end" },
  };
  return mappings[placement] || { side: "bottom", align: "start" };
}

interface RadixComboOptionsProps {
  children: ReactNode;
  className?: string;
  /** Use 'static' to always render when parent has isOpen true */
  static?: boolean;
  /** Custom placement */
  placement?: Placement;
  /** Portal to document.body (default true) */
  portal?: boolean;
  /** Custom reference element (ignored - kept for API compatibility) */
  referenceElement?: HTMLElement | null;
}

function RadixComboOptions(props: RadixComboOptionsProps) {
  const { children, className, static: staticProp = false, placement = "bottom-start", portal = true } = props;

  const ctx = useComboContext();
  const { side, align } = mapPlacementToRadix(placement);

  // For static mode, check if parent signals open
  if (!staticProp && !ctx.isOpen) {
    return null;
  }

  const content = (
    <PopoverPrimitive.Content
      side={side}
      align={align}
      sideOffset={4}
      className={cn(
        "z-50 outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      onOpenAutoFocus={(e) => {
        // Prevent auto-focus stealing - let the search input handle its own focus
        e.preventDefault();
      }}
    >
      <Command shouldFilter={false} className="bg-transparent">
        {children}
      </Command>
    </PopoverPrimitive.Content>
  );

  if (portal) {
    return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
  }

  return content;
}

// ============================================================================
// RadixComboInput - Search input
// ============================================================================

interface RadixComboInputProps {
  className?: string;
  placeholder?: string;
  /** Custom value (overrides context query) */
  value?: string;
  /** Custom onChange (overrides context setQuery) */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  displayValue?: (item: unknown) => string;
  /** Forward ref to the input element */
  ref?: React.Ref<HTMLInputElement>;
}

const RadixComboInput = forwardRef<HTMLInputElement, RadixComboInputProps>(function RadixComboInput(props, ref) {
  const { className, placeholder, value: customValue, onChange, onKeyDown, ...rest } = props;

  const ctx = useComboContext();

  const handleChange = useCallback(
    (newValue: string) => {
      if (onChange) {
        // Create a synthetic event for backwards compatibility
        const syntheticEvent = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      } else {
        ctx.setQuery(newValue);
      }
    },
    [onChange, ctx]
  );

  return (
    <CommandInput
      ref={ref}
      value={customValue ?? ctx.query}
      onValueChange={handleChange}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none border-0",
        className
      )}
      onKeyDown={onKeyDown}
      {...rest}
    />
  );
});

RadixComboInput.displayName = "RadixComboInput";

// ============================================================================
// RadixComboOption - Option item with render prop support
// ============================================================================

interface RenderProps {
  active: boolean;
  selected: boolean;
  disabled: boolean;
}

interface RadixComboOptionProps {
  value: string | null;
  disabled?: boolean;
  /** Supports both static className and render prop function */
  className?: string | ((props: RenderProps) => string);
  /** Supports both static children and render prop function */
  children: ReactNode | ((props: RenderProps) => ReactNode);
}

function RadixComboOption(props: RadixComboOptionProps) {
  const { value, disabled = false, className, children } = props;

  const ctx = useComboContext();
  const [isActive, setIsActive] = useState(false);

  // Check if this option is selected
  // For null values, compare directly; for strings, use includes for multiple mode
  const isSelected = ctx.multiple
    ? Array.isArray(ctx.value) && value !== null && ctx.value.includes(value)
    : ctx.value === value;

  const handleSelect = useCallback(() => {
    if (disabled) return;

    if (ctx.multiple) {
      const currentValue = Array.isArray(ctx.value) ? ctx.value : [];
      if (value !== null && currentValue.includes(value)) {
        ctx.onChange(currentValue.filter((v) => v !== value));
      } else if (value !== null) {
        ctx.onChange([...currentValue, value]);
      }
    } else {
      ctx.onChange(value);
      ctx.setIsOpen(false);
    }
  }, [ctx, value, disabled]);

  const renderProps: RenderProps = {
    active: isActive,
    selected: isSelected,
    disabled,
  };

  const resolvedClassName = typeof className === "function" ? className(renderProps) : className;

  const resolvedChildren = typeof children === "function" ? children(renderProps) : children;

  // CommandItem requires a string value, so use empty string for null
  const commandValue = value ?? "__null__";

  return (
    <CommandItem
      value={commandValue}
      disabled={disabled}
      onSelect={handleSelect}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      className={cn(
        "flex w-full cursor-pointer select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5",
        "data-[selected=true]:bg-layer-transparent-hover",
        {
          "text-placeholder opacity-60 cursor-not-allowed": disabled,
        },
        resolvedClassName
      )}
    >
      {resolvedChildren}
    </CommandItem>
  );
}

// ============================================================================
// RadixComboList - Command list wrapper
// ============================================================================

interface RadixComboListProps {
  children: ReactNode;
  className?: string;
}

function RadixComboList(props: RadixComboListProps) {
  const { children, className } = props;

  return <CommandList className={cn("max-h-48 overflow-y-auto", className)}>{children}</CommandList>;
}

// ============================================================================
// Export a hook to access combo context
// ============================================================================

function useRadixCombo() {
  return useComboContext();
}

// eslint-disable-next-line react-refresh/only-export-components
export { RadixComboDropDown, RadixComboOptions, RadixComboInput, RadixComboOption, RadixComboList, useRadixCombo };

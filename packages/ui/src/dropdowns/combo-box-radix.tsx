"use client";

/**
 * RadixComboBox - Radix-based ComboBox primitives
 *
 * This provides Radix-based alternatives to the HeadlessUI Combobox primitives.
 * It's designed to support a similar API to ease migration from HeadlessUI.
 *
 * Components:
 * - RadixComboDropDown: Main wrapper providing context and trigger button
 * - RadixComboOptions: Dropdown content wrapper (uses Popover internally)
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
import { createPortal } from "react-dom";
import type { Placement } from "@popperjs/core";
import { usePopper } from "react-popper";
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
  // Reference element for positioning
  referenceElement: HTMLElement | null;
  setReferenceElement: (el: HTMLElement | null) => void;
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
// RadixComboDropDown - Main wrapper
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
    autoOpen = false,
    ...rest
  } = props;

  const dropDownButtonRef = useRef<HTMLDivElement | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
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

  const handleButtonClick = useCallback(() => {
    if (!disabled && autoOpen) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled, autoOpen]);

  const contextValue: ComboContextValue = {
    isOpen,
    setIsOpen: handleSetIsOpen,
    value,
    onChange,
    multiple,
    referenceElement,
    setReferenceElement,
    query,
    setQuery,
    disabled,
  };

  const resolvedClassName = typeof className === "function" ? className(isOpen) : className;

  if (!shouldRender) {
    return (
      <div ref={dropDownButtonRef} className="h-full flex items-center">
        {button}
      </div>
    );
  }

  return (
    <ComboContext.Provider value={contextValue}>
      <Component {...rest} ref={ref} className={resolvedClassName} tabIndex={tabIndex} onKeyDown={onKeyDown}>
        <div
          ref={(el) => {
            if (dropDownButtonRef) {
              dropDownButtonRef.current = el;
            }
            setReferenceElement(el);
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleButtonClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleButtonClick();
            }
          }}
        >
          {button}
        </div>
        {children}
      </Component>
    </ComboContext.Provider>
  );
});

RadixComboDropDown.displayName = "RadixComboDropDown";

// ============================================================================
// RadixComboOptions - Dropdown content wrapper
// ============================================================================

interface RadixComboOptionsProps {
  children: ReactNode;
  className?: string;
  /** Use 'static' to always render when parent has isOpen true */
  static?: boolean;
  /** Custom placement */
  placement?: Placement;
  /** Portal to document.body */
  portal?: boolean;
  /** Custom reference element (overrides context) */
  referenceElement?: HTMLElement | null;
}

function RadixComboOptions(props: RadixComboOptionsProps) {
  const {
    children,
    className,
    static: staticProp = false,
    placement = "bottom-start",
    portal = true,
    referenceElement: customReferenceElement,
  } = props;

  const ctx = useComboContext();
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);

  const refElement = customReferenceElement ?? ctx.referenceElement;

  const { styles, attributes, update } = usePopper(refElement, popperElement, {
    placement,
    strategy: "fixed",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 12,
        },
      },
    ],
  });

  // Force popper to recalculate position when dropdown opens
  // Note: We use the cleanup function to reset state, which is the idiomatic
  // pattern for effects that need to "undo" their state changes
  useEffect(() => {
    // Only run the positioning logic when open and element exists
    if (!ctx.isOpen || !popperElement) {
      return;
    }

    let cancelled = false;
    let rafId2: number | undefined;
    const rafId1 = requestAnimationFrame(() => {
      if (cancelled) return;
      rafId2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const updatePromise = update?.();
        if (updatePromise) {
          updatePromise
            .then(() => {
              if (!cancelled) setIsPositioned(true);
              return undefined;
            })
            .catch(() => {
              if (!cancelled) setIsPositioned(true);
            });
        } else {
          setIsPositioned(true);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId1);
      if (rafId2 !== undefined) cancelAnimationFrame(rafId2);
      // Reset positioned state on cleanup (when dropdown closes or unmounts)
       
      setIsPositioned(false);
    };
  }, [ctx.isOpen, update, popperElement]);

  // For static mode, check if parent signals open
  if (!staticProp && !ctx.isOpen) {
    return null;
  }

  const content = (
    <div
      ref={setPopperElement}
      className={cn("z-50", className)}
      style={{
        ...styles.popper,
        opacity: isPositioned ? 1 : 0,
      }}
      {...attributes.popper}
      data-prevent-outside-click
    >
      <Command shouldFilter={false} className="bg-transparent">
        {children}
      </Command>
    </div>
  );

  if (portal) {
    return createPortal(content, document.body);
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
  value: string;
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
  const isSelected = ctx.multiple ? Array.isArray(ctx.value) && ctx.value.includes(value) : ctx.value === value;

  const handleSelect = useCallback(() => {
    if (disabled) return;

    if (ctx.multiple) {
      const currentValue = Array.isArray(ctx.value) ? ctx.value : [];
      if (currentValue.includes(value)) {
        ctx.onChange(currentValue.filter((v) => v !== value));
      } else {
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

  return (
    <CommandItem
      value={value}
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

"use client";

import { Check } from "lucide-react";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ChevronDownIcon } from "@plane/propel/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@plane/propel/primitives";
// helpers
import { cn } from "../utils";
// types
import type { ICustomSelectItemProps, ICustomSelectProps } from "./helper";

// Map placement from our API to Radix side/align
function mapPlacementToRadix(placement?: string): {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
} {
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

// Context to share the value, onChange, and close handler with option components
interface SelectContextValue<T> {
  value: T;
  onChange: ((value: T) => void) | undefined;
  closeDropdown: () => void;
}

const SelectContext = createContext<SelectContextValue<unknown>>({
  value: undefined,
  onChange: undefined,
  closeDropdown: () => {},
});

function CustomSelect<T = unknown>(props: ICustomSelectProps<T>) {
  const {
    customButtonClassName = "",
    buttonClassName = "",
    placement,
    children,
    className = "",
    customButton,
    disabled = false,
    input = false,
    label,
    maxHeight = "md",
    noChevron = false,
    onChange,
    optionsClassName = "",
    value,
    tabIndex,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { side, align } = mapPlacementToRadix(placement);

  const closeDropdown = useCallback(() => setIsOpen(false), []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const handleSelect = useCallback(
    (selectedValue: T) => {
      onChange?.(selectedValue);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  const triggerButton = customButton ? (
    <button
      ref={triggerRef}
      type="button"
      className={cn(
        "flex items-center justify-between gap-1 text-11 rounded",
        {
          "cursor-not-allowed text-secondary": disabled,
          "cursor-pointer hover:bg-layer-transparent-hover": !disabled,
        },
        customButtonClassName
      )}
      disabled={disabled}
      tabIndex={tabIndex}
    >
      {customButton}
    </button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-1 rounded border border-strong",
        {
          "px-3 py-2 text-13": input,
          "px-2 py-1 text-11": !input,
          "cursor-not-allowed text-secondary": disabled,
          "cursor-pointer hover:bg-layer-transparent-hover": !disabled,
        },
        buttonClassName
      )}
      disabled={disabled}
      tabIndex={tabIndex}
    >
      {label}
      {!noChevron && !disabled && <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />}
    </button>
  );

  return (
    <SelectContext.Provider
      value={{
        value,
        onChange: handleSelect as (value: unknown) => void,
        closeDropdown,
      }}
    >
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild disabled={disabled}>
          <div className={cn("relative flex-shrink-0 text-left", className)}>
            {triggerButton}
          </div>
        </PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          sideOffset={4}
          className={cn(
            "z-50 min-w-48 rounded-md border-[0.5px] border-subtle-1 bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 p-0",
            optionsClassName
          )}
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
        >
          <div
            className={cn("space-y-1 overflow-y-auto px-2 py-2.5", {
              "max-h-60": maxHeight === "lg",
              "max-h-48": maxHeight === "md",
              "max-h-36": maxHeight === "rg",
              "max-h-28": maxHeight === "sm",
            })}
          >
            {children}
          </div>
        </PopoverContent>
      </Popover>
    </SelectContext.Provider>
  );
}

function Option<T = unknown>(props: ICustomSelectItemProps<T>) {
  const { children, value: optionValue, className } = props;
  const { value: selectedValue, onChange, closeDropdown } = useContext(SelectContext);

  const isSelected = selectedValue === optionValue;

  const handleClick = useCallback(() => {
    onChange?.(optionValue);
    closeDropdown();
  }, [onChange, optionValue, closeDropdown]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={cn(
        "cursor-pointer select-none truncate rounded-sm px-1 py-1.5 text-secondary flex items-center justify-between gap-2",
        "hover:bg-layer-transparent-hover",
        {
          "text-primary": isSelected,
        },
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        {children}
        {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
      </div>
    </div>
  );
}

CustomSelect.Option = Option;

export { CustomSelect };

"use client";

import { Check, Info, Search } from "lucide-react";
import React, { useRef, useState } from "react";
import { ChevronDownIcon } from "@plane/propel/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@plane/propel/primitives";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@plane/propel/primitives";
import { Tooltip } from "@plane/propel/tooltip";
// helpers
import { cn } from "../utils";
// types
import type { ICustomSearchSelectProps } from "./helper";

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

export function CustomSearchSelect(props: ICustomSearchSelectProps) {
  const {
    customButtonClassName = "",
    buttonClassName = "",
    className = "",
    chevronClassName = "",
    customButton,
    placement,
    disabled = false,
    footerOption,
    input = false,
    label,
    maxHeight = "md",
    multiple = false,
    noChevron = false,
    onChange,
    options,
    onOpen,
    onClose,
    optionsClassName = "",
    value,
    tabIndex,
    noResultsMessage = "No matches found",
    defaultOpen = false,
  } = props;

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  const { side, align } = mapPlacementToRadix(placement);

  const filteredOptions =
    query === "" ? options : options?.filter((option) => option.query.toLowerCase().includes(query.toLowerCase()));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      onOpen?.();
      // Focus the input when opening
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      onClose?.();
      setQuery("");
    }
  };

  const handleSelect = (selectedValue: unknown) => {
    onChange(selectedValue);
    if (!multiple) {
      setIsOpen(false);
    }
  };

  // Check if a value is selected (handles both single and multi-select)
  const isSelected = (optionValue: unknown): boolean => {
    if (multiple && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const triggerButton = customButton ? (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-1 text-11",
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
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong",
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
      {!noChevron && !disabled && (
        <ChevronDownIcon className={cn("h-3 w-3 flex-shrink-0", chevronClassName)} aria-hidden="true" />
      )}
    </button>
  );

  return (
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
          "z-50 min-w-48 rounded-md border-[0.5px] border-subtle-1 bg-surface-1 text-11 shadow-raised-200 p-0",
          optionsClassName
        )}
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="bg-transparent">
          <div className="flex items-center gap-1.5 rounded-sm border border-subtle px-2 mx-2 mt-2.5">
            <Search className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
            <CommandInput
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search"
              className="flex h-8 w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none border-0"
            />
          </div>
          <CommandList
            className={cn("mt-2 px-2 pb-2.5 overflow-y-auto", {
              "max-h-96": maxHeight === "2xl",
              "max-h-80": maxHeight === "xl",
              "max-h-60": maxHeight === "lg",
              "max-h-48": maxHeight === "md",
              "max-h-36": maxHeight === "rg",
              "max-h-28": maxHeight === "sm",
            })}
          >
            <CommandEmpty className="py-1 px-1.5 text-placeholder italic text-sm">
              {options ? noResultsMessage : "Loading..."}
            </CommandEmpty>
            {filteredOptions?.map((option) => (
              <CommandItem
                key={String(option.value)}
                value={String(option.value)}
                disabled={option.disabled}
                onSelect={() => handleSelect(option.value)}
                className={cn(
                  "w-full truncate flex items-center justify-between gap-2 rounded-sm px-1 py-1.5 cursor-pointer select-none",
                  "data-[selected=true]:bg-layer-transparent-hover",
                  {
                    "text-placeholder opacity-60 cursor-not-allowed": option.disabled,
                  }
                )}
              >
                <span className="flex-grow truncate">{option.content}</span>
                {isSelected(option.value) && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                {option.tooltip && (
                  <>
                    {typeof option.tooltip === "string" ? (
                      <Tooltip tooltipContent={option.tooltip}>
                        <Info className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer text-secondary" />
                      </Tooltip>
                    ) : (
                      option.tooltip
                    )}
                  </>
                )}
              </CommandItem>
            ))}
          </CommandList>
          {footerOption}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

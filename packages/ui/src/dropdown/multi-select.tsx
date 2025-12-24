"use client";

import { sortBy } from "lodash-es";
import { Check, Search } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
// plane imports
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@plane/propel/primitives";
import { useOutsideClickDetector } from "@plane/hooks";
// local imports
import { useDropdownKeyPressed } from "../hooks/use-dropdown-key-pressed";
import { cn } from "../utils";
import type { IMultiSelectDropdown } from "./dropdown";

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

export function MultiSelectDropdown(props: IMultiSelectDropdown) {
  const {
    value,
    onChange,
    options,
    onOpen,
    onClose,
    containerClassName,
    tabIndex,
    placement,
    disabled,
    buttonContent,
    buttonContainerClassName,
    buttonClassName,
    disableSearch,
    inputPlaceholder,
    inputClassName,
    inputIcon,
    inputContainerClassName,
    keyExtractor,
    optionsContainerClassName,
    queryArray,
    sortByKey,
    firstItem,
    renderItem,
    loader = false,
    disableSorting,
  } = props;

  // states
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { side, align } = mapPlacementToRadix(placement);

  // handlers
  const toggleDropdown = () => {
    if (!isOpen) onOpen?.();
    setIsOpen((prevIsOpen) => !prevIsOpen);
    if (isOpen) onClose?.();
  };

  const handleOnClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    e.preventDefault();
    toggleDropdown();
  };

  const handleClose = () => {
    if (!isOpen) return;
    setIsOpen(false);
    onClose?.();
    setQuery?.("");
  };

  const handleOpenChange = (open: boolean) => {
    if (open && !isOpen) {
      onOpen?.();
      // Focus the input when opening
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!open && isOpen) {
      onClose?.();
      setQuery("");
    }
    setIsOpen(open);
  };

  // options
  const sortedOptions = useMemo(() => {
    if (!options) return undefined;

    const filteredOptions = queryArray
      ? (options || []).filter((option) => {
          const queryString = queryArray.map((q) => option.data[q]).join(" ");
          return queryString.toLowerCase().includes(query.toLowerCase());
        })
      : options;

    if (disableSorting) return filteredOptions;

    return sortBy(filteredOptions, [
      (option) => firstItem && firstItem(option.data[option.value]),
      (option) => !(value ?? []).includes(option.data[option.value]),
      () => sortByKey && sortByKey.toLowerCase(),
    ]);
  }, [query, options, queryArray, disableSorting, sortByKey, firstItem, value]);

  // hooks
  const handleKeyDown = useDropdownKeyPressed(toggleDropdown, handleClose);

  useOutsideClickDetector(dropdownRef, handleClose);

  const handleSelect = (selectedKey: string) => {
    // Toggle selection for multi-select
    const newValue = value.includes(selectedKey)
      ? value.filter((v) => v !== selectedKey)
      : [...value, selectedKey];
    onChange(newValue);
    // Don't close on multi-select
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <div
        ref={dropdownRef}
        className={cn(
          "h-full",
          typeof containerClassName === "function" ? containerClassName(isOpen) : containerClassName
        )}
        tabIndex={tabIndex}
        onKeyDown={handleKeyDown}
      >
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              "clickable block h-full max-w-full outline-none",
              {
                "cursor-not-allowed text-secondary": disabled,
                "cursor-pointer": !disabled,
              },
              buttonContainerClassName
            )}
            onClick={handleOnClick}
            disabled={disabled}
          >
            {buttonContent ? (
              <>{buttonContent(isOpen, value)}</>
            ) : (
              <span className={cn("", buttonClassName)}>{value.join(", ")}</span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          side={side}
          align={align}
          sideOffset={4}
          className={cn(
            "z-50 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 p-0",
            optionsContainerClassName
          )}
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
        >
          <Command shouldFilter={false} className="bg-transparent">
            {!disableSearch && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2 mx-2 mt-2",
                  inputContainerClassName
                )}
              >
                {inputIcon ? <>{inputIcon}</> : <Search className="h-4 w-4 text-tertiary" aria-hidden="true" />}
                <CommandInput
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={inputPlaceholder ?? "Search"}
                  className={cn(
                    "w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none border-0",
                    inputClassName
                  )}
                />
              </div>
            )}
            <CommandList className={cn("max-h-48 space-y-1 overflow-y-scroll px-2 pb-2.5", !disableSearch && "mt-2")}>
              <CommandEmpty className="py-1 px-1.5 text-placeholder italic">
                {options ? "No matching results" : "Loading..."}
              </CommandEmpty>
              {sortedOptions ? (
                sortedOptions.length > 0 ? (
                  sortedOptions.map((option) => {
                    const optionKey = keyExtractor(option);
                    const isSelected = value.includes(optionKey);

                    return (
                      <CommandItem
                        key={optionKey}
                        value={optionKey}
                        disabled={option.disabled}
                        onSelect={() => handleSelect(optionKey)}
                        className={cn(
                          "flex w-full cursor-pointer select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5",
                          "data-[selected=true]:bg-layer-1",
                          {
                            "text-primary": isSelected,
                            "text-secondary": !isSelected,
                            "text-placeholder opacity-60 cursor-not-allowed": option.disabled,
                          },
                          option.className && option.className({ active: false, selected: isSelected })
                        )}
                      >
                        {renderItem ? (
                          <>{renderItem({ value: optionKey, selected: isSelected, disabled: option.disabled })}</>
                        ) : (
                          <>
                            <span className="flex-grow truncate">{option.value}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                          </>
                        )}
                      </CommandItem>
                    );
                  })
                ) : null
              ) : loader ? (
                <>{loader}</>
              ) : (
                <div className="flex items-center justify-center py-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </div>
    </Popover>
  );
}

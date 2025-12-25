import React, { useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "../primitives/popover";
import { EmojiRoot } from "../emoji-icon-picker/emoji/emoji";
import { emojiToString } from "../emoji-icon-picker/helper";
import { cn } from "../utils/classname";

export interface EmojiReactionPickerProps {
  isOpen: boolean;
  handleToggle: (value: boolean) => void;
  buttonClassName?: string;
  closeOnSelect?: boolean;
  disabled?: boolean;
  dropdownClassName?: string;
  label: React.ReactNode;
  onChange: (emoji: string) => void;
  searchDisabled?: boolean;
  searchPlaceholder?: string;
}

export function EmojiReactionPicker(props: EmojiReactionPickerProps) {
  const {
    isOpen,
    handleToggle,
    buttonClassName,
    closeOnSelect = true,
    disabled = false,
    dropdownClassName,
    label,
    onChange,
    searchDisabled = false,
    searchPlaceholder = "Search",
  } = props;

  const handleEmojiChange = useCallback(
    (value: string) => {
      const emoji = emojiToString(value);
      onChange(emoji);
      if (closeOnSelect) handleToggle(false);
    },
    [onChange, closeOnSelect, handleToggle]
  );

  return (
    <Popover open={isOpen} onOpenChange={handleToggle}>
      <PopoverTrigger asChild disabled={disabled}>
        <button type="button" className={cn("outline-none", buttonClassName)}>
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-80 p-0 border-[0.5px] border-strong overflow-hidden", dropdownClassName)}
        align="start"
        sideOffset={8}
      >
        <div className="h-80 overflow-hidden overflow-y-auto">
          <EmojiRoot
            onChange={handleEmojiChange}
            searchPlaceholder={searchPlaceholder}
            searchDisabled={searchDisabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useMemo, useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "../primitives/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../primitives/tabs";
import { cn } from "../utils/classname";
import { EmojiRoot } from "./emoji/emoji";
import type { TCustomEmojiPicker } from "./helper";
import { emojiToString, EmojiIconPickerTypes } from "./helper";
import { IconRoot } from "./icon/icon-root";

export function EmojiPicker(props: TCustomEmojiPicker) {
  const {
    isOpen,
    handleToggle,
    buttonClassName,
    closeOnSelect = true,
    defaultIconColor = "#6d7b8a",
    defaultOpen = EmojiIconPickerTypes.EMOJI,
    disabled = false,
    dropdownClassName,
    label,
    onChange,
    searchDisabled = false,
    searchPlaceholder = "Search",
    iconType = "lucide",
  } = props;

  const handleEmojiChange = useCallback(
    (value: string) => {
      onChange({
        type: EmojiIconPickerTypes.EMOJI,
        value: emojiToString(value),
        shouldClose: true,
      });
      if (closeOnSelect) handleToggle(false);
    },
    [onChange, closeOnSelect, handleToggle]
  );

  // Random emoji handler - updates emoji but keeps dropdown open
  const handleRandomEmoji = useCallback(
    (value: string) => {
      onChange({
        type: EmojiIconPickerTypes.EMOJI,
        value: emojiToString(value),
        shouldClose: false,
      });
      // Don't close dropdown - let user click multiple times to find one they like
    },
    [onChange]
  );

  const handleIconChange = useCallback(
    (value: { name: string; color: string }) => {
      onChange({
        type: EmojiIconPickerTypes.ICON,
        value: value,
        shouldClose: true,
      });
      if (closeOnSelect) handleToggle(false);
    },
    [onChange, closeOnSelect, handleToggle]
  );

  const tabs = useMemo(
    () => [
      {
        key: "emoji",
        label: "Emoji",
        content: (
          <EmojiRoot
            onChange={handleEmojiChange}
            onRandomEmoji={handleRandomEmoji}
            searchPlaceholder={searchPlaceholder}
            searchDisabled={searchDisabled}
          />
        ),
      },
      {
        key: "icon",
        label: "Icon",
        content: (
          <IconRoot
            defaultColor={defaultIconColor}
            onChange={handleIconChange}
            searchDisabled={searchDisabled}
            iconType={iconType}
          />
        ),
      },
    ],
    [defaultIconColor, searchDisabled, searchPlaceholder, iconType, handleEmojiChange, handleRandomEmoji, handleIconChange]
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
        <Tabs defaultValue={defaultOpen}>
          <TabsList className="grid grid-cols-2 gap-1 px-3.5 pt-3 bg-transparent h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={cn(
                  "py-1 text-13 rounded-sm border border-subtle bg-layer-1",
                  "data-[state=active]:bg-surface-1 data-[state=active]:text-primary data-[state=active]:shadow-none",
                  "data-[state=inactive]:text-placeholder data-[state=inactive]:hover:text-tertiary data-[state=inactive]:hover:bg-layer-1/60"
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="h-80 overflow-hidden overflow-y-auto mt-0">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

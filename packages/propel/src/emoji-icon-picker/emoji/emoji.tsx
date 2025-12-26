import { useEffect, useRef, useCallback } from "react";
import { EmojiPicker } from "frimousse";
import { Shuffle } from "lucide-react";
import { cn } from "../../utils";
import { getRandomSafeEmoji } from "../safe-emojis";

type EmojiRootProps = {
  onChange: (value: string) => void;
  searchPlaceholder?: string;
  searchDisabled?: boolean;
  emojibaseUrl?: string;
};

// Default to self-hosted emojibase data to avoid external CDN dependencies
const DEFAULT_EMOJIBASE_URL = "/emojibase-data";

export function EmojiRoot(props: EmojiRootProps) {
  const {
    onChange,
    searchPlaceholder = "Search",
    searchDisabled = false,
    emojibaseUrl = DEFAULT_EMOJIBASE_URL,
  } = props;
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const handleRandomEmoji = useCallback(() => {
    const randomEmoji = getRandomSafeEmoji();
    onChange(randomEmoji);
  }, [onChange]);

  useEffect(() => {
    const focusInput = () => {
      const searchWrapper = searchWrapperRef.current;
      if (searchWrapper) {
        const inputElement = searchWrapper.querySelector("input");
        if (inputElement) {
          inputElement.removeAttribute("disabled");
          inputElement.focus();
        }
      }
    };
    focusInput();
  }, []);

  return (
    <EmojiPicker.Root
      data-slot="emoji-picker"
      className="isolate flex flex-col rounded-md h-full w-full border-none p-2"
      onEmojiSelect={(val) => onChange(val.emoji)}
      emojibaseUrl={emojibaseUrl}
    >
      <div className="flex items-center gap-2 justify-between [&>[data-slot='emoji-picker-search-wrapper']]:flex-grow [&>[data-slot='emoji-picker-search-wrapper']]:p-0 px-1.5 py-2 sticky top-0 z-10 bg-surface-1">
        <div ref={searchWrapperRef} data-slot="emoji-picker-search-wrapper" className="p-2">
          <EmojiPicker.Search
            placeholder={searchPlaceholder}
            disabled={searchDisabled}
            className="block rounded-md bg-transparent placeholder-(--text-color-placeholder) focus:outline-none px-3 py-2 border-[0.5px] border-subtle text-16 p-0 h-full w-full flex-grow-0 focus:border-accent-strong"
          />
        </div>
        <button
          type="button"
          onClick={handleRandomEmoji}
          data-slot="emoji-picker-random-button"
          className="bg-surface-1 hover:bg-accent mx-2 mb-1.5 size-8 rounded-md flex items-center justify-center flex-shrink-0 text-tertiary hover:text-primary transition-colors"
          title="Random emoji"
        >
          <Shuffle className="size-4" />
        </button>
      </div>
      <EmojiPicker.Viewport data-slot="emoji-picker-content" className={cn("relative flex-1 outline-none")}>
        <EmojiPicker.Loading>
          <div className="flex items-center justify-center h-full text-tertiary text-13">Loading emojis...</div>
        </EmojiPicker.Loading>
        <EmojiPicker.Empty>
          <div className="flex items-center justify-center h-full text-tertiary text-13">No emojis found</div>
        </EmojiPicker.Empty>
        <EmojiPicker.List
          data-slot="emoji-picker-list"
          className={cn("pb-2 select-none")}
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                data-slot="emoji-picker-list-category-header"
                className="bg-surface-1 text-tertiary px-3 pb-1.5 text-11 font-medium"
                {...props}
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div data-slot="emoji-picker-list-row" className="scroll-my-1.5 px-1.5" {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                type="button"
                aria-label={emoji?.label ?? emoji?.emoji}
                data-slot="emoji-picker-list-emoji"
                className="data-active:bg-accent flex size-8 items-center justify-center rounded-md text-16"
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}

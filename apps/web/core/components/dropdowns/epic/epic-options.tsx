import { useEffect, useRef, useState } from "react";
import type { Placement } from "@popperjs/core";
import { Check, Search } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { EpicIcon } from "@plane/propel/icons";
import type { IEpic } from "@plane/types";
import { RadixComboOptions, RadixComboInput, RadixComboOption } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";

type DropdownOptions =
  | {
      value: string | null;
      query: string;
      content: React.ReactNode;
    }[]
  | undefined;

interface Props {
  getEpicById: (epicId: string) => IEpic | null;
  isOpen: boolean;
  epicIds?: string[];
  multiple: boolean;
  onDropdownOpen?: () => void;
  placement: Placement | undefined;
}

export function EpicOptions(props: Props) {
  const { getEpicById, isOpen, epicIds, multiple, onDropdownOpen, placement } = props;
  // refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  // states
  const [query, setQuery] = useState("");
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { isMobile } = usePlatformOS();

  useEffect(() => {
    if (isOpen) {
      onOpen();
      if (!isMobile) {
        inputRef.current && inputRef.current.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMobile]);

  const onOpen = () => {
    onDropdownOpen?.();
  };

  const searchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (query !== "" && e.key === "Escape") {
      e.stopPropagation();
      setQuery("");
    }
  };

  const options: DropdownOptions = epicIds?.map((epicId) => {
    const epicDetails = getEpicById(epicId);
    return {
      value: epicId,
      query: `${epicDetails?.name}`,
      content: (
        <div className="flex items-center gap-2">
          <EpicIcon className="h-3 w-3 flex-shrink-0" />
          <span className="flex-grow truncate">{epicDetails?.name}</span>
        </div>
      ),
    };
  });
  if (!multiple)
    options?.unshift({
      value: null,
      query: t("epic.no_epic"),
      content: (
        <div className="flex items-center gap-2">
          <EpicIcon className="h-3 w-3 flex-shrink-0" />
          <span className="flex-grow truncate">{t("epic.no_epic")}</span>
        </div>
      ),
    });

  const filteredOptions =
    query === "" ? options : options?.filter((o) => o.query.toLowerCase().includes(query.toLowerCase()));

  return (
    <RadixComboOptions
      static
      placement={placement ?? "bottom-start"}
      className="my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none"
    >
      <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
        <Search className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
        <RadixComboInput
          ref={inputRef}
          className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search.label")}
          onKeyDown={searchInputKeyDown}
        />
      </div>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-scroll">
        {filteredOptions ? (
          filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <RadixComboOption
                key={option.value ?? "__null__"}
                value={option.value}
                className={({ active, selected }) =>
                  cn(
                    "flex w-full cursor-pointer select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5",
                    {
                      "bg-layer-transparent-hover": active,
                      "text-primary": selected,
                      "text-secondary": !selected,
                    }
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className="flex-grow truncate">{option.content}</span>
                    {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </>
                )}
              </RadixComboOption>
            ))
          ) : (
            <p className="px-1.5 py-1 italic text-placeholder">{t("common.search.no_matching_results")}</p>
          )
        ) : (
          <p className="px-1.5 py-1 italic text-placeholder">{t("common.loading")}</p>
        )}
      </div>
    </RadixComboOptions>
  );
}

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Search } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { IntakeStateGroupIcon, ChevronDownIcon } from "@plane/propel/icons";
import type { IIntakeState } from "@plane/types";
import { RadixComboDropDown, RadixComboOptions, RadixComboInput, Spinner } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { DropdownButton } from "@/components/dropdowns/buttons";
import { BUTTON_VARIANTS_WITH_TEXT } from "@/components/dropdowns/constants";
import type { TDropdownProps } from "@/components/dropdowns/types";
// hooks
import { useDropdown } from "@/hooks/use-dropdown";
// plane web imports
import { StateOption } from "@/plane-web/components/workflow";

export type TWorkItemStateDropdownBaseProps = TDropdownProps & {
  alwaysAllowStateChange?: boolean;
  button?: ReactNode;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  filterAvailableStateIds?: boolean;
  getStateById: (stateId: string | null | undefined) => IIntakeState | undefined;
  iconSize?: string;
  isForWorkItemCreation?: boolean;
  isInitializing?: boolean;
  onChange: (val: string) => void;
  onClose?: () => void;
  onDropdownOpen?: () => void;
  projectId: string | undefined;
  renderByDefault?: boolean;
  showDefaultState?: boolean;
  stateIds: string[];
  value: string | undefined | null;
};

export function WorkItemStateDropdownBase(props: TWorkItemStateDropdownBaseProps) {
  const {
    button,
    buttonClassName,
    buttonContainerClassName,
    buttonVariant,
    className = "",
    disabled = false,
    dropdownArrow = false,
    dropdownArrowClassName = "",
    getStateById,
    hideIcon = false,
    iconSize = "size-4",
    isInitializing = false,
    onChange,
    onClose,
    onDropdownOpen,
    placement,
    renderByDefault = true,
    showDefaultState = true,
    showTooltip = false,
    stateIds,
    tabIndex,
    value,
  } = props;
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // popper-js refs
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null);
  // states
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  // store hooks
  const { t } = useTranslation();
  const statesList = stateIds.map((stateId) => getStateById(stateId)).filter((state) => !!state);
  const defaultState = statesList?.find((state) => state?.default) || statesList[0];
  const stateValue = value ? value : showDefaultState ? defaultState?.id : undefined;
  // dropdown init
  const { handleClose, handleKeyDown, handleOnClick, searchInputKeyDown } = useDropdown({
    dropdownRef,
    inputRef,
    isOpen,
    onClose,
    onOpen: onDropdownOpen,
    query,
    setIsOpen,
    setQuery,
  });

  // derived values
  const options = statesList?.map((state) => ({
    value: state?.id,
    query: `${state?.name}`,
    content: (
      <div className="flex items-center gap-2">
        <IntakeStateGroupIcon
          stateGroup={state?.group ?? "triage"}
          color={state?.color}
          className={cn("flex-shrink-0", iconSize)}
        />
        <span className="flex-grow truncate text-left">{state?.name}</span>
      </div>
    ),
  }));

  const filteredOptions =
    query === "" ? options : options?.filter((o) => o.query.toLowerCase().includes(query.toLowerCase()));

  const selectedState = stateValue ? getStateById(stateValue) : undefined;

  const dropdownOnChange = (val: string) => {
    onChange(val);
    handleClose();
  };

  const comboButton = (
    <>
      {button ? (
        <div
          ref={setReferenceElement}
          role="button"
          tabIndex={disabled ? -1 : (tabIndex ?? 0)}
          className={cn("clickable block h-full w-full outline-none", buttonContainerClassName)}
          onClick={disabled ? undefined : handleOnClick}
          onKeyDown={
            disabled
              ? undefined
              : (e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleOnClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
          }
        >
          {button}
        </div>
      ) : (
        <div
          tabIndex={disabled ? -1 : (tabIndex ?? 0)}
          ref={setReferenceElement}
          role="button"
          className={cn(
            "clickable block h-full max-w-full outline-none",
            {
              "cursor-not-allowed text-secondary pointer-events-none": disabled,
              "cursor-pointer": !disabled,
            },
            buttonContainerClassName
          )}
          onClick={disabled ? undefined : handleOnClick}
          onKeyDown={
            disabled
              ? undefined
              : (e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleOnClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
          }
        >
          <DropdownButton
            className={buttonClassName}
            isActive={isOpen}
            tooltipHeading={t("state")}
            tooltipContent={selectedState?.name ?? t("state")}
            showTooltip={showTooltip}
            variant={buttonVariant}
            renderToolTipByDefault={renderByDefault}
          >
            {isInitializing ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <>
                {!hideIcon && (
                  <IntakeStateGroupIcon
                    stateGroup={selectedState?.group ?? "triage"}
                    color={selectedState?.color ?? "var(--text-color-tertiary)"}
                    className={cn("flex-shrink-0", iconSize)}
                  />
                )}
                {BUTTON_VARIANTS_WITH_TEXT.includes(buttonVariant) && (
                  <span className="flex-grow truncate text-left">{selectedState?.name ?? t("state")}</span>
                )}
                {dropdownArrow && (
                  <ChevronDownIcon
                    className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)}
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </DropdownButton>
        </div>
      )}
    </>
  );

  return (
    <RadixComboDropDown
      as="div"
      ref={dropdownRef}
      className={cn("h-full", className)}
      value={stateValue}
      onChange={dropdownOnChange as (value: unknown) => void}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      button={comboButton}
      renderByDefault={renderByDefault}
    >
      {isOpen && (
        <RadixComboOptions
          static
          placement={placement ?? "bottom-start"}
          referenceElement={referenceElement}
          className="my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none"
        >
          <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
            <Search className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
            <RadixComboInput
              ref={inputRef}
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
                  <StateOption
                    {...props}
                    key={option.value}
                    option={option}
                    selectedValue={value}
                    className="flex w-full cursor-pointer select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5"
                  />
                ))
              ) : (
                <p className="px-1.5 py-1 italic text-placeholder">{t("no_matching_results")}</p>
              )
            ) : (
              <p className="px-1.5 py-1 italic text-placeholder">{t("loading")}</p>
            )}
          </div>
        </RadixComboOptions>
      )}
    </RadixComboDropDown>
  );
}

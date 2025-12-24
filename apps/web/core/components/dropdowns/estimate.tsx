import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Search } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { EstimatePropertyIcon, ChevronDownIcon } from "@plane/propel/icons";
import { EEstimateSystem } from "@plane/types";
import { RadixComboDropDown, RadixComboOptions, RadixComboInput, RadixComboOption, RadixComboList } from "@plane/ui";
import { convertMinutesToHoursMinutesString, cn } from "@plane/utils";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useEstimate } from "@/hooks/store/estimates/use-estimate";
import { useDropdown } from "@/hooks/use-dropdown";
// components
import { DropdownButton } from "./buttons";
import { BUTTON_VARIANTS_WITH_TEXT } from "./constants";
// types
import type { TDropdownProps } from "./types";

type Props = TDropdownProps & {
  button?: ReactNode;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  onChange: (val: string | undefined) => void;
  onClose?: () => void;
  projectId: string | undefined;
  value: string | undefined | null;
  renderByDefault?: boolean;
};

type DropdownOptions =
  | {
      value: string | null;
      query: string;
      content: React.ReactNode;
    }[]
  | undefined;

export function EstimateDropdown(props: Props) {
  const {
    button,
    buttonClassName,
    buttonContainerClassName,
    buttonVariant,
    className = "",
    disabled = false,
    dropdownArrow = false,
    dropdownArrowClassName = "",
    hideIcon = false,
    onChange,
    onClose,
    placeholder = "",
    placement,
    projectId,
    showTooltip = false,
    tabIndex,
    value,
    renderByDefault = true,
  } = props;
  // i18n
  const { t } = useTranslation();
  // states
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // button ref
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  // router
  const { workspaceSlug: _workspaceSlug } = useParams();
  // store hooks
  const { currentActiveEstimateIdByProjectId, getEstimateById } = useProjectEstimates();
  const currentActiveEstimateId = projectId ? currentActiveEstimateIdByProjectId(projectId) : undefined;
  const currentActiveEstimate = currentActiveEstimateId ? getEstimateById(currentActiveEstimateId) : undefined;
  const { estimatePointIds, estimatePointById } = useEstimate(currentActiveEstimateId);

  const options: DropdownOptions = (estimatePointIds ?? [])
    ?.map((estimatePoint: string) => {
      const currentEstimatePoint = estimatePointById(estimatePoint);
      if (currentEstimatePoint)
        return {
          value: currentEstimatePoint.id,
          query: `${currentEstimatePoint?.value}`,
          content: (
            <div className="flex items-center gap-2">
              <EstimatePropertyIcon className="h-3 w-3 flex-shrink-0" />
              <span className="flex-grow truncate">
                {currentActiveEstimate?.type === EEstimateSystem.TIME
                  ? convertMinutesToHoursMinutesString(Number(currentEstimatePoint.value))
                  : currentEstimatePoint.value}
              </span>
            </div>
          ),
        };
      return undefined;
    })
    .filter(
      (estimatePointDropdownOption): estimatePointDropdownOption is NonNullable<typeof estimatePointDropdownOption> =>
        estimatePointDropdownOption != undefined
    ) as DropdownOptions;
  options?.unshift({
    value: null,
    query: t("project_settings.estimates.no_estimate"),
    content: (
      <div className="flex items-center gap-2">
        <EstimatePropertyIcon className="h-3 w-3 flex-shrink-0" />
        <span className="flex-grow truncate">{t("project_settings.estimates.no_estimate")}</span>
      </div>
    ),
  });

  const filteredOptions =
    query === "" ? options : options?.filter((o) => o.query.toLowerCase().includes(query.toLowerCase()));

  const selectedEstimate = value && estimatePointById ? estimatePointById(value) : undefined;

  const onOpen = () => {
    // TanStack Query handles fetching automatically
  };

  const { handleClose, handleKeyDown, handleOnClick, searchInputKeyDown } = useDropdown({
    dropdownRef,
    inputRef,
    isOpen,
    onClose,
    onOpen,
    query,
    setIsOpen,
    setQuery,
  });

  const dropdownOnChange = (val: unknown) => {
    onChange(val as string | undefined);
    handleClose();
  };

  const comboButton = (
    <>
      {button ? (
        <button
          ref={setReferenceElement}
          type="button"
          className={cn("clickable block h-full w-full outline-none", buttonContainerClassName)}
          onClick={handleOnClick}
          disabled={disabled}
        >
          {button}
        </button>
      ) : (
        <button
          ref={setReferenceElement}
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
          <DropdownButton
            className={buttonClassName}
            isActive={isOpen}
            tooltipHeading={t("project_settings.estimates.label")}
            tooltipContent={selectedEstimate ? selectedEstimate?.value : placeholder}
            showTooltip={showTooltip}
            variant={buttonVariant}
            renderToolTipByDefault={renderByDefault}
          >
            {!hideIcon && <EstimatePropertyIcon className="h-3 w-3 flex-shrink-0" />}
            {(selectedEstimate || placeholder) && BUTTON_VARIANTS_WITH_TEXT.includes(buttonVariant) && (
              <span className="flex-grow truncate">
                {selectedEstimate
                  ? currentActiveEstimate?.type === EEstimateSystem.TIME
                    ? convertMinutesToHoursMinutesString(Number(selectedEstimate.value))
                    : selectedEstimate.value
                  : placeholder}
              </span>
            )}
            {dropdownArrow && (
              <ChevronDownIcon className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
            )}
          </DropdownButton>
        </button>
      )}
    </>
  );

  return (
    <RadixComboDropDown
      as="div"
      ref={dropdownRef}
      tabIndex={tabIndex}
      className={cn("h-full w-full", className)}
      value={value}
      onChange={dropdownOnChange}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      button={comboButton}
      renderByDefault={renderByDefault}
    >
      {isOpen && (
        <RadixComboOptions static placement={placement ?? "bottom-start"} referenceElement={referenceElement}>
          <div className="my-1 w-48 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 text-11 shadow-raised-200 focus:outline-none">
            <div className="flex items-center gap-1.5 rounded-sm border border-subtle bg-surface-2 px-2">
              <Search className="h-3.5 w-3.5 text-placeholder" strokeWidth={1.5} />
              <RadixComboInput
                ref={inputRef}
                className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.search.placeholder")}
                onKeyDown={searchInputKeyDown}
              />
            </div>
            <RadixComboList className="mt-2 space-y-1">
              {currentActiveEstimateId === undefined ? (
                <div
                  className={`flex w-full cursor-pointer select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 text-secondary`}
                >
                  {/* NOTE: This condition renders when estimates are not enabled for the project */}
                  <div className="flex-grow flex items-center gap-2">
                    <EstimatePropertyIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="flex-grow truncate">{t("project_settings.estimates.no_estimate")}</span>
                  </div>
                </div>
              ) : (
                <>
                  {filteredOptions ? (
                    filteredOptions.length > 0 ? (
                      filteredOptions.map((option) => (
                        <RadixComboOption key={option.value} value={option.value ?? ""}>
                          {({ active, selected }) => (
                            <div
                              className={cn(
                                "flex w-full cursor-pointer select-none items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5",
                                {
                                  "bg-layer-transparent-hover": active,
                                  "text-primary": selected,
                                  "text-secondary": !selected,
                                }
                              )}
                            >
                              <span className="flex-grow truncate">{option.content}</span>
                              {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                            </div>
                          )}
                        </RadixComboOption>
                      ))
                    ) : (
                      <p className="px-1.5 py-1 italic text-placeholder">{t("common.search.no_matching_results")}</p>
                    )
                  ) : (
                    <p className="px-1.5 py-1 italic text-placeholder">{t("common.loading")}</p>
                  )}
                </>
              )}
            </RadixComboList>
          </div>
        </RadixComboOptions>
      )}
    </RadixComboDropDown>
  );
}

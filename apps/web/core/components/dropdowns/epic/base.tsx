import type { ReactNode } from "react";
import { useEffect, useRef, useState, memo } from "react";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { IEpic } from "@plane/types";
import { RadixComboDropDown } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { useDropdown } from "@/hooks/use-dropdown";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local imports
import { DropdownButton } from "../buttons";
import { BUTTON_VARIANTS_WITHOUT_TEXT } from "../constants";
import type { TDropdownProps } from "../types";
import { EpicButtonContent } from "./button-content";
import { EpicOptions } from "./epic-options";

type TEpicDropdownBaseProps = TDropdownProps & {
  button?: ReactNode;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  getEpicById: (epicId: string) => IEpic | null;
  itemClassName?: string;
  epicIds?: string[];
  onClose?: () => void;
  onDropdownOpen?: () => void;
  projectId: string | undefined;
  renderByDefault?: boolean;
  showCount?: boolean;
} & (
    | {
        multiple: false;
        onChange: (val: string | null) => void;
        value: string | null;
      }
    | {
        multiple: true;
        onChange: (val: string[]) => void;
        value: string[] | null;
      }
  );

export const EpicDropdownBase = memo(function EpicDropdownBase(props: TEpicDropdownBaseProps) {
  const {
    button,
    buttonClassName,
    buttonContainerClassName,
    buttonVariant,
    className = "",
    disabled = false,
    dropdownArrow = false,
    dropdownArrowClassName = "",
    getEpicById,
    hideIcon = false,
    itemClassName = "",
    epicIds,
    multiple,
    onChange,
    onClose,
    placeholder = "",
    placement,
    projectId,
    renderByDefault = true,
    showCount = false,
    showTooltip = false,
    tabIndex,
    value,
  } = props;
  // i18n
  const { t } = useTranslation();
  // states
  const [isOpen, setIsOpen] = useState(false);
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // store hooks
  const { isMobile } = usePlatformOS();

  const { handleClose, handleKeyDown, handleOnClick } = useDropdown({
    dropdownRef,
    inputRef,
    isOpen,
    onClose,
    setIsOpen,
  });

  const dropdownOnChange = (val: unknown) => {
    onChange(val as string & string[]);
    if (!multiple) handleClose();
  };

  useEffect(() => {
    if (isOpen && inputRef.current && !isMobile) {
      inputRef.current.focus();
    }
  }, [isOpen, isMobile]);

  const comboButton = (
    <>
      {button ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : (tabIndex ?? 0)}
          className={cn(
            "clickable block h-full w-full outline-none hover:bg-layer-1",
            { "pointer-events-none": disabled },
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
          {button}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : (tabIndex ?? 0)}
          className={cn(
            "clickable block h-full max-w-full outline-none hover:bg-layer-1",
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
            tooltipHeading={t("common.epic")}
            tooltipContent={
              Array.isArray(value)
                ? `${value
                    .map((epicId) => getEpicById(epicId)?.name)
                    .toString()
                    .replaceAll(",", ", ")}`
                : ""
            }
            showTooltip={showTooltip}
            variant={buttonVariant}
            renderToolTipByDefault={renderByDefault}
          >
            <EpicButtonContent
              disabled={disabled}
              dropdownArrow={dropdownArrow}
              dropdownArrowClassName={dropdownArrowClassName}
              hideIcon={hideIcon}
              hideText={BUTTON_VARIANTS_WITHOUT_TEXT.includes(buttonVariant)}
              placeholder={placeholder}
              showCount={showCount}
              showTooltip={showTooltip}
              value={value}
              onChange={onChange as (value: string | string[] | undefined) => void}
              className={itemClassName}
            />
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
      onKeyDown={handleKeyDown}
      button={comboButton}
      renderByDefault={renderByDefault}
      value={value}
      onChange={dropdownOnChange}
      disabled={disabled}
      multiple={multiple}
    >
      {isOpen && projectId && (
        <EpicOptions
          isOpen={isOpen}
          placement={placement}
          multiple={multiple}
          getEpicById={getEpicById}
          epicIds={epicIds}
        />
      )}
    </RadixComboDropDown>
  );
});

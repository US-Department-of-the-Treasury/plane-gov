"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import type { Placement } from "@popperjs/core";
import { ChevronDown } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { StateGroupIcon } from "@plane/propel/icons";
import { SelectCombobox } from "@plane/propel/combobox";
import { Tooltip } from "@plane/propel/tooltip";
import { Spinner } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useProjectStates, getStateById, getStateIds } from "@/store/queries/state";
// types
import type { TButtonVariants } from "../types";
import { BUTTON_VARIANTS_WITH_TEXT, BORDER_BUTTON_VARIANTS, BACKGROUND_BUTTON_VARIANTS } from "../constants";

// =============================================================================
// Types
// =============================================================================

type StateComboboxProps = {
  value: string | null | undefined;
  onChange: (val: string) => void;
  projectId: string | undefined;
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonVariant?: TButtonVariants;
  className?: string;
  disabled?: boolean;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  hideIcon?: boolean;
  iconSize?: string;
  placement?: Placement;
  showDefaultState?: boolean;
  showTooltip?: boolean;
  tabIndex?: number;
  button?: React.ReactNode;
  onClose?: () => void;
  optionsClassName?: string;
  // Props for workflow restrictions (used in EE)
  isForWorkItemCreation?: boolean;
  alwaysAllowStateChange?: boolean;
  filterAvailableStateIds?: boolean;
  stateIds?: string[];
};

// =============================================================================
// Component
// =============================================================================

export function StateCombobox(props: StateComboboxProps) {
  const {
    button,
    buttonClassName,
    buttonContainerClassName,
    buttonVariant = "border-with-text",
    className,
    disabled = false,
    dropdownArrow = false,
    dropdownArrowClassName = "",
    hideIcon = false,
    iconSize = "size-4",
    onChange,
    onClose,
    optionsClassName = "",
    placement,
    projectId,
    showDefaultState = true,
    showTooltip = false,
    stateIds: propsStateIds,
    tabIndex,
    value,
  } = props;

  // hooks
  const { t } = useTranslation();
  const { workspaceSlug } = useParams();
  const { isMobile } = usePlatformOS();

  // data fetching
  const { data: states, isLoading } = useProjectStates(workspaceSlug?.toString() ?? "", projectId ?? "");

  // Get state IDs and default state
  const stateIds = useMemo(() => {
    if (propsStateIds) return propsStateIds;
    return states ? getStateIds(states) : [];
  }, [propsStateIds, states]);

  const defaultState = useMemo(() => {
    if (!states) return undefined;
    return states.find((state) => state.default);
  }, [states]);

  // The effective value (use default if no value and showDefaultState is true)
  const effectiveValue = value ?? (showDefaultState ? defaultState?.id : undefined);

  // Get selected state details
  const selectedState = useMemo(() => {
    if (!effectiveValue || !states) return undefined;
    return getStateById(states, effectiveValue);
  }, [effectiveValue, states]);

  // Handle value change
  const handleValueChange = (newValue: string | string[] | null) => {
    if (typeof newValue === "string") {
      onChange(newValue);
    }
  };

  // Convert placement to side/align for SelectCombobox
  const sideAlign = useMemo(() => {
    if (!placement) return { side: "bottom" as const, align: "start" as const };

    const parts = placement.split("-");
    const side = parts[0] as "top" | "bottom" | "left" | "right";
    const align = parts[1] === "end" ? "end" : parts[1] === "start" ? "start" : "center";

    return { side, align: align };
  }, [placement]);

  // Button styling based on variant
  const getButtonClassName = () => {
    const baseClasses = "h-full w-full flex items-center justify-start gap-1.5";

    if (BORDER_BUTTON_VARIANTS.includes(buttonVariant)) {
      return cn(baseClasses, "border-[0.5px] border-strong");
    }
    if (BACKGROUND_BUTTON_VARIANTS.includes(buttonVariant)) {
      return cn(baseClasses, "bg-layer-3 hover:bg-layer-1-hover");
    }
    return baseClasses;
  };

  // The trigger button
  const triggerButton = button ? (
    <div className={cn("clickable block h-full w-full outline-none", buttonContainerClassName)}>{button}</div>
  ) : (
    <Tooltip
      tooltipHeading={t("state")}
      tooltipContent={selectedState?.name ?? t("state")}
      disabled={!showTooltip}
      isMobile={isMobile}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        className={cn(
          getButtonClassName(),
          "text-11 rounded-sm px-2 py-0.5",
          {
            "cursor-not-allowed text-secondary pointer-events-none": disabled,
            "cursor-pointer": !disabled,
          },
          buttonClassName
        )}
      >
        {isLoading ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <>
            {!hideIcon && (
              <StateGroupIcon
                stateGroup={selectedState?.group ?? "backlog"}
                color={selectedState?.color ?? "var(--text-color-tertiary)"}
                className={cn("flex-shrink-0", iconSize)}
                percentage={selectedState?.order}
              />
            )}
            {BUTTON_VARIANTS_WITH_TEXT.includes(buttonVariant) && (
              <span className="flex-grow truncate leading-5 text-left text-body-xs-medium">
                {selectedState?.name ?? t("state")}
              </span>
            )}
            {dropdownArrow && (
              <ChevronDown className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
            )}
          </>
        )}
      </div>
    </Tooltip>
  );

  return (
    <div className={cn("h-full", className)}>
      <SelectCombobox
        value={effectiveValue ?? null}
        onValueChange={handleValueChange}
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
        multiple={false}
        disabled={disabled}
      >
        <SelectCombobox.Trigger className={cn("h-full", buttonContainerClassName)}>
          {triggerButton}
        </SelectCombobox.Trigger>

        <SelectCombobox.Content
          className={cn("w-48", optionsClassName)}
          searchPlaceholder={t("common.search.label")}
          emptyMessage={t("no_matching_results")}
          showSearch={true}
          maxHeight="md"
          side={sideAlign.side}
          align={sideAlign.align}
          width="auto"
        >
          {stateIds.map((stateId) => {
            const state = states ? getStateById(states, stateId) : undefined;
            if (!state) return null;

            return (
              <SelectCombobox.Item
                key={stateId}
                value={stateId}
                keywords={[state.name]}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StateGroupIcon
                    stateGroup={state.group ?? "backlog"}
                    color={state.color}
                    className={cn("flex-shrink-0", iconSize)}
                    percentage={state.order}
                  />
                  <span className="flex-grow truncate">{state.name}</span>
                </div>
              </SelectCombobox.Item>
            );
          })}
        </SelectCombobox.Content>
      </SelectCombobox>
    </div>
  );
}

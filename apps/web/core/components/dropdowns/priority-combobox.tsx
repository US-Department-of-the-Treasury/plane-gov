"use client";

import { useMemo } from "react";
import type { Placement } from "@popperjs/core";
import { ChevronDown, SignalHigh } from "lucide-react";
// plane imports
import { ISSUE_PRIORITIES } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { PriorityIcon } from "@plane/propel/icons";
import { SelectCombobox } from "@plane/propel/combobox";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssuePriorities } from "@plane/types";
import { cn } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
// types
import type { TButtonVariants } from "./types";
import { BORDER_BUTTON_VARIANTS, BACKGROUND_BUTTON_VARIANTS, BUTTON_VARIANTS_WITHOUT_TEXT } from "./constants";

// =============================================================================
// Types
// =============================================================================

type PriorityComboboxProps = {
  value: TIssuePriorities | undefined | null;
  onChange: (val: TIssuePriorities) => void;
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonVariant?: TButtonVariants;
  className?: string;
  disabled?: boolean;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  hideIcon?: boolean;
  highlightUrgent?: boolean;
  placeholder?: string;
  placement?: Placement;
  showTooltip?: boolean;
  tabIndex?: number;
  button?: React.ReactNode;
  onClose?: () => void;
  optionsClassName?: string;
};

// =============================================================================
// Component
// =============================================================================

export function PriorityCombobox(props: PriorityComboboxProps) {
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
    highlightUrgent = true,
    onChange,
    onClose,
    optionsClassName = "",
    placeholder,
    placement,
    showTooltip = false,
    tabIndex,
    value = "none",
  } = props;

  // hooks
  const { t } = useTranslation();
  const { isMobile } = usePlatformOS();

  const defaultPlaceholder = placeholder ?? t("common.priority");

  // Get priority details
  const priorityDetails = ISSUE_PRIORITIES.find((p) => p.key === value);
  const hideText = BUTTON_VARIANTS_WITHOUT_TEXT.includes(buttonVariant);

  // Handle value change
  const handleValueChange = (newValue: string | string[] | null) => {
    if (typeof newValue === "string") {
      onChange(newValue as TIssuePriorities);
    }
  };

  // Convert placement to side/align for SelectCombobox
  const sideAlign = useMemo(() => {
    if (!placement) return { side: "bottom" as const, align: "start" as const };

    const parts = placement.split("-");
    const side = parts[0] as "top" | "bottom" | "left" | "right";
    const align = (parts[1] === "end" ? "end" : parts[1] === "start" ? "start" : "center") as "center" | "end" | "start";

    return { side, align };
  }, [placement]);

  // Priority-specific styles
  const priorityClasses = {
    urgent: "border-priority-urgent",
    high: "border-priority-high",
    medium: "border-priority-medium",
    low: "border-priority-low",
    none: "border-strong",
  };

  // Button styling based on variant
  const getButtonClassName = () => {
    const baseClasses = "h-full w-full flex items-center gap-1.5";
    const priority = value ?? "none";

    if (BORDER_BUTTON_VARIANTS.includes(buttonVariant)) {
      return cn(baseClasses, "border-[0.5px] rounded-sm px-2 py-0.5 bg-layer-2", priorityClasses[priority], {
        "px-0.5": hideText,
        "border-priority-urgent": priority === "urgent" && hideText && highlightUrgent,
      });
    }
    if (BACKGROUND_BUTTON_VARIANTS.includes(buttonVariant)) {
      return cn(baseClasses, "bg-layer-3 hover:bg-layer-1-hover rounded-sm px-2 py-0.5", {
        "px-0.5": hideText,
      });
    }
    return cn(baseClasses, "hover:bg-layer-transparent-hover rounded-sm px-2", {
      "px-0.5": hideText,
    });
  };

  // Render priority icon
  const renderIcon = () => {
    if (hideIcon) return null;

    if (value) {
      const iconWrapper = (
        <PriorityIcon
          priority={value}
          size={12}
          className={cn("flex-shrink-0", {
            "h-3.5 w-3.5": hideText,
            "translate-x-[0.0625rem]": hideText && value === "high",
            "translate-x-0.5": hideText && value === "medium",
            "translate-x-1": hideText && value === "low",
          })}
        />
      );

      if (value === "urgent" && !hideText && highlightUrgent) {
        return <div className="p-0.5 rounded-sm border border-priority-urgent">{iconWrapper}</div>;
      }
      return iconWrapper;
    }

    return <SignalHigh className="size-3" />;
  };

  // The trigger button
  const triggerButton = button ? (
    <div className={cn("clickable block h-full w-full outline-none", buttonContainerClassName)}>{button}</div>
  ) : (
    <Tooltip
      tooltipHeading={t("priority")}
      tooltipContent={priorityDetails?.title ?? t("common.none")}
      disabled={!showTooltip}
      isMobile={isMobile}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        className={cn(
          getButtonClassName(),
          "text-11",
          {
            "cursor-not-allowed text-secondary pointer-events-none": disabled,
            "cursor-pointer": !disabled,
          },
          buttonClassName
        )}
      >
        {renderIcon()}
        {!hideText && (
          <span
            className={cn("flex-grow truncate leading-5 text-left text-body-xs-medium", {
              "text-secondary": value && value !== "none",
              "text-placeholder": !value || value === "none",
            })}
          >
            {priorityDetails?.title ?? defaultPlaceholder}
          </span>
        )}
        {dropdownArrow && (
          <ChevronDown className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
        )}
      </div>
    </Tooltip>
  );

  return (
    <div className={cn("h-full", className)}>
      <SelectCombobox
        value={value ?? null}
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
          searchPlaceholder={t("search")}
          emptyMessage={t("no_matching_results")}
          showSearch={true}
          maxHeight="md"
          side={sideAlign.side}
          align={sideAlign.align}
          width="auto"
        >
          {ISSUE_PRIORITIES.map((priority) => (
            <SelectCombobox.Item
              key={priority.key}
              value={priority.key}
              keywords={[priority.key, priority.title]}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <PriorityIcon priority={priority.key} size={14} withContainer />
                <span className="flex-grow truncate">{priority.title}</span>
              </div>
            </SelectCombobox.Item>
          ))}
        </SelectCombobox.Content>
      </SelectCombobox>
    </div>
  );
}

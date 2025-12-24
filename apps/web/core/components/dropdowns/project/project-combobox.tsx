"use client";

import { useMemo } from "react";
import type { Placement } from "@popperjs/core";
import { ChevronDown } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { ProjectIcon } from "@plane/propel/icons";
import { Button } from "@plane/propel/button";
import { SelectCombobox } from "@plane/propel/combobox";
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useProjects, getProjectById, getJoinedProjectIds } from "@/store/queries/project";
// types
import type { TProject } from "@/plane-web/types";
import type { TButtonVariants } from "../types";
import { BUTTON_VARIANTS_WITH_TEXT, BORDER_BUTTON_VARIANTS, BACKGROUND_BUTTON_VARIANTS } from "../constants";

// =============================================================================
// Types
// =============================================================================

type ProjectComboboxBaseProps = {
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonVariant?: TButtonVariants;
  className?: string;
  currentProjectId?: string;
  disabled?: boolean;
  dropdownArrow?: boolean;
  dropdownArrowClassName?: string;
  hideIcon?: boolean;
  placeholder?: string;
  placement?: Placement;
  showTooltip?: boolean;
  tabIndex?: number;
  button?: React.ReactNode;
  onClose?: () => void;
  optionsClassName?: string;
  renderCondition?: (projectId: string) => boolean;
  workspaceSlug: string;
};

type ProjectComboboxSingleProps = ProjectComboboxBaseProps & {
  multiple: false;
  onChange: (val: string) => void;
  value: string | null;
};

type ProjectComboboxMultiProps = ProjectComboboxBaseProps & {
  multiple: true;
  onChange: (val: string[]) => void;
  value: string[];
};

export type ProjectComboboxProps = ProjectComboboxSingleProps | ProjectComboboxMultiProps;

// =============================================================================
// Component
// =============================================================================

export function ProjectCombobox(props: ProjectComboboxProps) {
  const {
    button,
    buttonClassName,
    buttonContainerClassName,
    buttonVariant = "border-with-text",
    className,
    currentProjectId,
    disabled = false,
    dropdownArrow = false,
    dropdownArrowClassName = "",
    hideIcon = false,
    multiple,
    onChange,
    onClose,
    optionsClassName = "",
    placeholder = "Project",
    placement,
    renderCondition,
    showTooltip = false,
    tabIndex,
    value,
    workspaceSlug,
  } = props;

  // hooks
  const { t } = useTranslation();
  const { isMobile } = usePlatformOS();

  // data fetching
  const { data: projects } = useProjects(workspaceSlug);

  // Get project IDs
  const projectIds = useMemo(() => {
    if (!projects) return [];
    return getJoinedProjectIds(projects);
  }, [projects]);

  // Filter project IDs based on renderCondition and currentProjectId
  const filteredProjectIds = useMemo(() => {
    return projectIds.filter((id) => {
      if (id === currentProjectId) return false;
      if (renderCondition && !renderCondition(id)) return false;
      return true;
    });
  }, [projectIds, currentProjectId, renderCondition]);

  // Get project details helper
  const getProject = (projectId: string | null | undefined): Partial<TProject> | undefined => {
    if (!projectId || !projects) return undefined;
    return getProjectById(projects, projectId);
  };

  // Get display text
  const displayText = useMemo(() => {
    if (Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1) {
        const project = projects ? getProjectById(projects, value[0]) : undefined;
        return project?.name ?? placeholder;
      }
      return `${value.length} projects`;
    } else {
      if (!value) return placeholder;
      const project = projects ? getProjectById(projects, value) : undefined;
      return project?.name ?? placeholder;
    }
  }, [value, placeholder, projects]);

  // Handle value change
  const handleValueChange = (newValue: string | string[] | null) => {
    if (multiple) {
      (onChange as (val: string[]) => void)(Array.isArray(newValue) ? newValue : []);
    } else {
      (onChange as (val: string) => void)(typeof newValue === "string" ? newValue : "");
    }
  };

  // Convert placement to side/align for SelectCombobox
  const sideAlign = useMemo(() => {
    if (!placement) return { side: "bottom" as const, align: "start" as const };

    const parts = placement.split("-");
    const side = parts[0] as "top" | "bottom" | "left" | "right";
    const align = parts[1] === "end" ? "end" : parts[1] === "start" ? "start" : "center";

    return { side, align: align as "start" | "center" | "end" };
  }, [placement]);

  // Render project icon
  const renderProjectIcon = () => {
    if (hideIcon) return null;

    const renderIcon = (logoProps: TProject["logo_props"]) => (
      <span className="grid place-items-center flex-shrink-0 h-4 w-4">
        <Logo logo={logoProps} size={14} />
      </span>
    );

    if (Array.isArray(value)) {
      if (value.length > 0) {
        return (
          <div className="flex items-center gap-0.5">
            {value.map((projectId) => {
              const projectDetails = getProject(projectId);
              return projectDetails?.logo_props ? (
                <span key={projectId}>{renderIcon(projectDetails.logo_props)}</span>
              ) : null;
            })}
          </div>
        );
      }
      return <ProjectIcon className="size-3 text-tertiary" />;
    } else {
      const projectDetails = getProject(value);
      return projectDetails?.logo_props ? renderIcon(projectDetails.logo_props) : <ProjectIcon className="size-3 text-tertiary" />;
    }
  };

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
      tooltipHeading={t("project")}
      tooltipContent={
        Array.isArray(value) && value.length
          ? `${value.length} project${value.length !== 1 ? "s" : ""}`
          : displayText
      }
      disabled={!showTooltip}
      isMobile={isMobile}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(getButtonClassName(), "text-11", buttonClassName)}
        disabled={disabled}
        tabIndex={tabIndex}
      >
        {renderProjectIcon()}
        {BUTTON_VARIANTS_WITH_TEXT.includes(buttonVariant) && (
          <span className="flex-grow truncate leading-5 text-left text-body-xs-medium max-w-40">{displayText}</span>
        )}
        {dropdownArrow && (
          <ChevronDown className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
        )}
      </Button>
    </Tooltip>
  );

  return (
    <div className={cn("h-full", className)}>
      <SelectCombobox
        value={multiple ? value : value ?? null}
        onValueChange={handleValueChange}
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
        multiple={multiple}
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
          {filteredProjectIds.map((projectId) => {
            const project = getProject(projectId);
            if (!project) return null;

            return (
              <SelectCombobox.Item
                key={projectId}
                value={projectId}
                keywords={[project.name ?? ""]}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {project.logo_props && (
                    <span className="grid place-items-center flex-shrink-0 h-4 w-4">
                      <Logo logo={project.logo_props} size={12} />
                    </span>
                  )}
                  <span className="flex-grow truncate">{project.name}</span>
                </div>
              </SelectCombobox.Item>
            );
          })}
        </SelectCombobox.Content>
      </SelectCombobox>
    </div>
  );
}

// plane imports
import { CloseIcon, EpicIcon, ChevronDownIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
// hooks
import { useParams } from "next/navigation";
import { useWorkspaceEpics, getEpicById } from "@/store/queries/epic";
import { usePlatformOS } from "@/hooks/use-platform-os";

type EpicButtonContentProps = {
  disabled: boolean;
  dropdownArrow: boolean;
  dropdownArrowClassName: string;
  hideIcon: boolean;
  hideText: boolean;
  onChange: (epicIds: string[]) => void;
  placeholder?: string;
  showCount: boolean;
  showTooltip?: boolean;
  value: string | string[] | null;
  className?: string;
};

export function EpicButtonContent(props: EpicButtonContentProps) {
  const {
    disabled,
    dropdownArrow,
    dropdownArrowClassName,
    hideIcon,
    hideText,
    onChange,
    placeholder,
    showCount,
    showTooltip = false,
    value,
    className,
  } = props;
  // router
  const { workspaceSlug } = useParams();
  // fetch workspace epics using TanStack Query
  const { data: epics } = useWorkspaceEpics(workspaceSlug?.toString() ?? "");
  const { isMobile } = usePlatformOS();

  if (Array.isArray(value))
    return (
      <>
        {showCount ? (
          <div className="relative flex items-center max-w-full gap-1">
            {!hideIcon && <EpicIcon className="h-3 w-3 flex-shrink-0" />}
            {(value.length > 0 || !!placeholder) && (
              <div className="max-w-40 flex-grow truncate">
                {value.length > 0
                  ? value.length === 1
                    ? `${getEpicById(epics, value[0])?.name || "epic"}`
                    : `${value.length} Epic${value.length === 1 ? "" : "s"}`
                  : placeholder}
              </div>
            )}
          </div>
        ) : value.length > 0 ? (
          <div className="flex max-w-full flex-grow flex-wrap items-center gap-2 truncate py-0.5 ">
            {value.map((epicId) => {
              const epicDetails = getEpicById(epics, epicId);
              return (
                <div
                  key={epicId}
                  className={cn(
                    "flex max-w-full items-center gap-1 rounded-sm bg-layer-1 py-1 text-secondary",
                    className
                  )}
                >
                  {!hideIcon && <EpicIcon className="h-2.5 w-2.5 flex-shrink-0" />}
                  {!hideText && (
                    <Tooltip
                      tooltipHeading="Title"
                      tooltipContent={epicDetails?.name}
                      disabled={!showTooltip}
                      isMobile={isMobile}
                      renderByDefault={false}
                    >
                      <span className="max-w-40 flex-grow truncate text-11 font-medium">{epicDetails?.name}</span>
                    </Tooltip>
                  )}
                  {!disabled && (
                    <Tooltip
                      tooltipContent="Remove"
                      disabled={!showTooltip}
                      isMobile={isMobile}
                      renderByDefault={false}
                    >
                      <button
                        type="button"
                        className="flex-shrink-0"
                        onClick={() => {
                          const newEpicIds = value.filter((m) => m !== epicId);
                          onChange(newEpicIds);
                        }}
                      >
                        <CloseIcon className="h-2.5 w-2.5 text-tertiary hover:text-red-500" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {!hideIcon && <EpicIcon className="h-3 w-3 flex-shrink-0" />}
            <span className="flex-grow truncate text-left">{placeholder}</span>
          </>
        )}
        {dropdownArrow && (
          <ChevronDownIcon className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
        )}
      </>
    );
  else
    return (
      <>
        {!hideIcon && <EpicIcon className="h-3 w-3 flex-shrink-0" />}
        {!hideText && (
          <span className="flex-grow truncate text-left">{value ? getEpicById(epics, value)?.name : placeholder}</span>
        )}
        {dropdownArrow && (
          <ChevronDownIcon className={cn("h-2.5 w-2.5 flex-shrink-0", dropdownArrowClassName)} aria-hidden="true" />
        )}
      </>
    );
}

import { useState, memo } from "react";
import { Users, Filter, UserCheck, UserX, Calendar, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { cn } from "@plane/utils";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

// Team member view filters
const TEAM_FILTERS = [
  { id: "all", label: "All Team Members", icon: Users },
  { id: "assigned", label: "Assigned to Sprint", icon: UserCheck },
  { id: "unassigned", label: "Unassigned", icon: UserX },
  { id: "current-sprint", label: "Current Sprint Only", icon: Calendar },
] as const;

type TeamFilterId = (typeof TEAM_FILTERS)[number]["id"];

const TeamFilterItem = memo(function TeamFilterItem({
  filter,
  isActive,
  onClick,
}: {
  filter: (typeof TEAM_FILTERS)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = filter.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
        isActive
          ? "bg-custom-primary-100/10 text-custom-primary-100"
          : "text-custom-text-200 hover:bg-custom-background-80"
      )}
    >
      <Icon className="size-4 flex-shrink-0" />
      <span className="flex-1 text-left">{filter.label}</span>
    </button>
  );
});

const TeamFiltersSection = memo(function TeamFiltersSection({
  activeFilter,
  setActiveFilter,
}: {
  activeFilter: TeamFilterId;
  setActiveFilter: (id: TeamFilterId) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-custom-border-200">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-custom-text-400 uppercase hover:bg-custom-background-80"
          >
            <ChevronRight
              className={cn("size-3 transition-transform", {
                "rotate-90": isOpen,
              })}
            />
            <span>View Options</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="px-2 pb-2">
            {TEAM_FILTERS.map((filter) => (
              <TeamFilterItem
                key={filter.id}
                filter={filter}
                isActive={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

const QuickActionsSection = memo(function QuickActionsSection() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-custom-border-200">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-custom-text-400 uppercase hover:bg-custom-background-80"
          >
            <ChevronRight
              className={cn("size-3 transition-transform", {
                "rotate-90": isOpen,
              })}
            />
            <span>Quick Actions</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="px-4 pb-3 space-y-2">
            <div className="text-sm text-custom-text-300">Export Assignments</div>
            <div className="text-sm text-custom-text-300">View Capacity</div>
            <div className="text-sm text-custom-text-300">Sprint Summary</div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

/**
 * Resources mode sidebar with team/HR-focused filter options
 * Uses per-mode sidebar collapse state for independent collapse behavior
 */
export function ResourcesSidebar() {
  // store hooks - using resources-specific collapse state
  const {
    resourcesSidebarCollapsed,
    toggleResourcesSidebar,
    sidebarPeek,
    toggleSidebarPeek,
    isAnySidebarDropdownOpen,
  } = useAppTheme();
  const { storedValue, setValue } = useLocalStorage("resourcesSidebarWidth", SIDEBAR_WIDTH);

  // states
  const [sidebarWidth, setSidebarWidth] = useState<number>(storedValue ?? SIDEBAR_WIDTH);
  const [activeFilter, setActiveFilter] = useState<TeamFilterId>("all");

  // handlers
  const handleWidthChange = (width: number) => setValue(width);

  return (
    <ResizableSidebar
      showPeek={sidebarPeek}
      defaultWidth={storedValue ?? 250}
      width={sidebarWidth}
      setWidth={setSidebarWidth}
      defaultCollapsed={resourcesSidebarCollapsed}
      peekDuration={1500}
      onWidthChange={handleWidthChange}
      onCollapsedChange={toggleResourcesSidebar}
      isCollapsed={resourcesSidebarCollapsed}
      toggleCollapsed={toggleResourcesSidebar}
      togglePeek={toggleSidebarPeek}
      isAnyExtendedSidebarExpanded={false}
      isAnySidebarDropdownOpen={isAnySidebarDropdownOpen}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-custom-text-200" />
            <h2 className="text-base font-semibold">Team Resources</h2>
          </div>
          <button className="p-1 rounded hover:bg-custom-background-80 text-custom-text-200" title="Filter options">
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Team Filters */}
        <TeamFiltersSection activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

        {/* Quick Actions */}
        <QuickActionsSection />

        {/* Info section */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="size-8 text-custom-text-400 mb-2" />
            <p className="text-sm text-custom-text-300">Sprint Assignment Matrix</p>
            <p className="text-xs text-custom-text-400 mt-1">Assign team members to projects by sprint</p>
          </div>
        </div>
      </div>
    </ResizableSidebar>
  );
}

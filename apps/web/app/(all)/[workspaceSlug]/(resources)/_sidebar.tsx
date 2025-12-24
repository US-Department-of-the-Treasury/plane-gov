import { useState, memo } from "react";
import { FolderOpen, Filter, File, Link, Image, FileText, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { cn } from "@plane/utils";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

// Resource type filters
const RESOURCE_TYPES = [
  { id: "all", label: "All Resources", icon: FolderOpen },
  { id: "files", label: "Files", icon: File },
  { id: "links", label: "Links", icon: Link },
  { id: "images", label: "Images", icon: Image },
  { id: "documents", label: "Documents", icon: FileText },
] as const;

type ResourceTypeId = (typeof RESOURCE_TYPES)[number]["id"];

const ResourceTypeFilter = memo(function ResourceTypeFilter({
  type,
  isActive,
  onClick,
}: {
  type: (typeof RESOURCE_TYPES)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = type.icon;
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
      <span className="flex-1 text-left">{type.label}</span>
    </button>
  );
});

const FilterByTypeSection = memo(function FilterByTypeSection({
  activeFilter,
  setActiveFilter,
}: {
  activeFilter: ResourceTypeId;
  setActiveFilter: (id: ResourceTypeId) => void;
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
            <span>Filter by Type</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="px-2 pb-2">
            {RESOURCE_TYPES.map((type) => (
              <ResourceTypeFilter
                key={type.id}
                type={type}
                isActive={activeFilter === type.id}
                onClick={() => setActiveFilter(type.id)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

const QuickFiltersSection = memo(function QuickFiltersSection() {
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
            <span>Quick Filters</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="px-4 pb-3 space-y-2">
            <div className="text-sm text-custom-text-300">Recently Added</div>
            <div className="text-sm text-custom-text-300">Favorites</div>
            <div className="text-sm text-custom-text-300">Shared with Me</div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

/**
 * Resources mode sidebar with filter options
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
  const [activeFilter, setActiveFilter] = useState<ResourceTypeId>("all");

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
            <FolderOpen className="h-5 w-5 text-custom-text-200" />
            <h2 className="text-base font-semibold">Resources</h2>
          </div>
          <button className="p-1 rounded hover:bg-custom-background-80 text-custom-text-200" title="Filter options">
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Filter by Type */}
        <FilterByTypeSection activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

        {/* Quick Filters */}
        <QuickFiltersSection />

        {/* Placeholder content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="size-8 text-custom-text-400 mb-2" />
            <p className="text-sm text-custom-text-300">Resources coming soon</p>
            <p className="text-xs text-custom-text-400 mt-1">Organize files, links, and documents</p>
          </div>
        </div>
      </div>
    </ResizableSidebar>
  );
}

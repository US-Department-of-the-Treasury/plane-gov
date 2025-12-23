import { useState } from "react";
import { FolderOpen, Filter } from "lucide-react";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

/**
 * Resources mode sidebar - placeholder for Phase 2
 * Full implementation (filters, view options) comes in Phase 3
 */
export function ResourcesSidebar() {
  // store hooks
  const { sidebarCollapsed, toggleSidebar, sidebarPeek, toggleSidebarPeek, isAnySidebarDropdownOpen } = useAppTheme();
  const { storedValue, setValue } = useLocalStorage("resourcesSidebarWidth", SIDEBAR_WIDTH);
  // states
  const [sidebarWidth, setSidebarWidth] = useState<number>(storedValue ?? SIDEBAR_WIDTH);

  // handlers
  const handleWidthChange = (width: number) => setValue(width);

  return (
    <ResizableSidebar
      showPeek={sidebarPeek}
      defaultWidth={storedValue ?? 250}
      width={sidebarWidth}
      setWidth={setSidebarWidth}
      defaultCollapsed={sidebarCollapsed}
      peekDuration={1500}
      onWidthChange={handleWidthChange}
      onCollapsedChange={toggleSidebar}
      isCollapsed={sidebarCollapsed}
      toggleCollapsed={toggleSidebar}
      togglePeek={toggleSidebarPeek}
      isAnyExtendedSidebarExpanded={false}
      isAnySidebarDropdownOpen={isAnySidebarDropdownOpen}
    >
      <div className="flex flex-col h-full px-3 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-custom-text-200" />
            <span className="font-medium text-custom-text-100">Resources</span>
          </div>
          <button className="p-1 rounded hover:bg-custom-background-80 text-custom-text-200" title="Filter resources">
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Placeholder content - will be replaced with filters in Phase 3 */}
        <div className="flex-1 text-sm text-custom-text-300">
          <p className="text-center py-8">Resource filters will appear here</p>
        </div>
      </div>
    </ResizableSidebar>
  );
}

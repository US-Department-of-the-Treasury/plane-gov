import { useState, memo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Users, UserPlus, Calendar, BarChart3, ChevronRight, UserCheck } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { cn } from "@plane/utils";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { SidebarWrapper } from "@/components/sidebar/sidebar-wrapper";
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
import { SidebarAddButton } from "@/components/sidebar/add-button";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";

// Navigation items for resources mode
const RESOURCES_PERSONAL_ITEMS = [
  {
    key: "team",
    label: "Team Members",
    href: "/resources/",
    icon: <Users className="size-4" />,
    highlight: (pathname: string, _url: string) => pathname === _url || pathname.endsWith("/resources/"),
  },
  {
    key: "assignments",
    label: "Assignments",
    href: "/resources/assignments/",
    icon: <UserCheck className="size-4" />,
    highlight: (pathname: string, _url: string) => pathname.includes("/assignments"),
  },
  {
    key: "capacity",
    label: "Capacity",
    href: "/resources/capacity/",
    icon: <BarChart3 className="size-4" />,
    highlight: (pathname: string, _url: string) => pathname.includes("/capacity"),
  },
];

const RESOURCES_WORKSPACE_ITEMS = [
  {
    key: "sprints",
    label: "Sprints",
    href: "/resources/sprints/",
    icon: <Calendar className="size-4" />,
    highlight: (pathname: string, _url: string) => pathname.includes("/sprints"),
  },
];

const ResourcesNavItem = memo(function ResourcesNavItem({
  item,
  workspaceSlug,
}: {
  item: (typeof RESOURCES_PERSONAL_ITEMS)[number];
  workspaceSlug: string;
}) {
  const pathname = usePathname();
  const { toggleSidebar, isExtendedSidebarOpened, toggleExtendedSidebar } = useAppTheme();

  const handleLinkClick = () => {
    if (window.innerWidth < 768) toggleSidebar();
    if (isExtendedSidebarOpened) toggleExtendedSidebar(false);
  };

  const itemHref = `/${workspaceSlug}${item.href}`;
  const isActive = item.highlight(pathname, itemHref);

  return (
    <Link href={itemHref} onClick={handleLinkClick}>
      <SidebarNavItem isActive={isActive}>
        <div className="flex items-center gap-1.5 py-[1px]">
          {item.icon}
          <p className="text-13 leading-5 font-medium">{item.label}</p>
        </div>
      </SidebarNavItem>
    </Link>
  );
});

const ResourcesMenuItems = memo(function ResourcesMenuItems() {
  const { workspaceSlug } = useParams();
  const slug = workspaceSlug?.toString() || "";

  const { setValue: toggleWorkspaceMenu, storedValue: isWorkspaceMenuOpen } = useLocalStorage<boolean>(
    "is_resources_workspace_menu_open",
    true
  );

  return (
    <>
      {/* Personal Section */}
      <div className="flex flex-col gap-0.5">
        {RESOURCES_PERSONAL_ITEMS.map((item) => (
          <ResourcesNavItem key={item.key} item={item} workspaceSlug={slug} />
        ))}
      </div>

      {/* Workspace Section */}
      <Collapsible open={!!isWorkspaceMenuOpen} onOpenChange={toggleWorkspaceMenu} className="flex flex-col">
        <div className="group w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-placeholder hover:bg-layer-transparent-hover">
          <CollapsibleTrigger className="w-full flex items-center gap-1 whitespace-nowrap text-left text-13 font-semibold text-placeholder">
            <span className="text-13 font-semibold">Planning</span>
          </CollapsibleTrigger>
          <div className="flex items-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
            <CollapsibleTrigger className="p-0.5 rounded-sm hover:bg-layer-1 flex-shrink-0">
              <ChevronRight
                className={cn("flex-shrink-0 size-3 transition-all", {
                  "rotate-90": isWorkspaceMenuOpen,
                })}
              />
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="flex flex-col gap-0.5">
            {RESOURCES_WORKSPACE_ITEMS.map((item) => (
              <ResourcesNavItem key={item.key} item={item} workspaceSlug={slug} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
});

const ResourcesQuickActions = memo(function ResourcesQuickActions() {
  return (
    <div className="flex items-center justify-between gap-2 cursor-pointer">
      <SidebarAddButton
        label={
          <>
            <UserPlus className="size-4" />
            <span className="text-13 font-medium truncate max-w-[145px]">Add team member</span>
          </>
        }
        onClick={() => {
          // TODO: Implement add team member modal
          console.log("Add team member clicked");
        }}
        disabled={false}
      />
    </div>
  );
});

function ResourcesSidebarContent() {
  return (
    <SidebarWrapper title="Resources" quickActions={<ResourcesQuickActions />}>
      <ResourcesMenuItems />
    </SidebarWrapper>
  );
}

/**
 * Resources mode sidebar with team/HR-focused navigation
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
      <ResourcesSidebarContent />
    </ResizableSidebar>
  );
}

import { useState, memo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Users, Plus, UserCheck } from "lucide-react";
import { SIDEBAR_WIDTH, MEMBER_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { useLocalStorage } from "@plane/hooks";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspaceBulkInviteFormData } from "@plane/types";
import { Tooltip } from "@plane/ui";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { SidebarWrapper } from "@/components/sidebar/sidebar-wrapper";
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { captureSuccess, captureError } from "@/helpers/event-tracker.helper";
import { useInviteWorkspaceMembers } from "@/store/queries/member";
// plane web components
import { SendWorkspaceInvitationModal } from "@/plane-web/components/workspace/members";

// Navigation items for resources mode
const RESOURCES_NAV_ITEMS = [
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
];

const ResourcesNavItem = memo(function ResourcesNavItem({
  item,
  workspaceSlug,
}: {
  item: (typeof RESOURCES_NAV_ITEMS)[number];
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

  return (
    <div className="flex flex-col gap-0.5">
      {RESOURCES_NAV_ITEMS.map((item) => (
        <ResourcesNavItem key={item.key} item={item} workspaceSlug={slug} />
      ))}
    </div>
  );
});

function ResourcesSidebarContent() {
  const { workspaceSlug } = useParams();
  const { t } = useTranslation();
  const [inviteModal, setInviteModal] = useState(false);
  const { mutate: inviteWorkspaceMembers } = useInviteWorkspaceMembers();

  const handleWorkspaceInvite = (data: IWorkspaceBulkInviteFormData): Promise<void> => {
    return new Promise((resolve, reject) => {
      inviteWorkspaceMembers(
        {
          workspaceSlug: workspaceSlug?.toString() ?? "",
          data,
        },
        {
          onSuccess: () => {
            setInviteModal(false);

            captureSuccess({
              eventName: MEMBER_TRACKER_EVENTS.invite,
              payload: {
                emails: data.emails.map((email) => email.email),
              },
            });

            setToast({
              type: TOAST_TYPE.SUCCESS,
              title: "Success!",
              message: t("workspace_settings.settings.members.invitations_sent_successfully"),
            });
            resolve();
          },
          onError: (error: unknown) => {
            let message = undefined;
            if (error instanceof Error) {
              const err = error as Error & { error?: string };
              message = err.error;
            }
            captureError({
              eventName: MEMBER_TRACKER_EVENTS.invite,
              payload: {
                emails: data.emails.map((email) => email.email),
              },
              error: error as Error,
            });

            setToast({
              type: TOAST_TYPE.ERROR,
              title: "Error!",
              message: `${message ?? t("something_went_wrong_please_try_again")}`,
            });
            reject(error instanceof Error ? error : new Error(String(error)));
          },
        }
      );
    });
  };

  const headerActions = (
    <Tooltip tooltipContent="Invite member">
      <button
        type="button"
        className="p-1 rounded hover:bg-layer-transparent-hover"
        onClick={() => setInviteModal(true)}
      >
        <Plus className="size-4" />
      </button>
    </Tooltip>
  );

  return (
    <>
      <SendWorkspaceInvitationModal
        isOpen={inviteModal}
        onClose={() => setInviteModal(false)}
        onSubmit={handleWorkspaceInvite}
      />
      <SidebarWrapper title="Resources" headerActions={headerActions}>
        <ResourcesMenuItems />
      </SidebarWrapper>
    </>
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

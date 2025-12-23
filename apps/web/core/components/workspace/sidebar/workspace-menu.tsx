import { useParams } from "next/navigation";
import { Disclosure, Transition } from "@headlessui/react";
// plane imports
import { AnalyticsIcon, SprintIcon, ProjectIcon, TeamsIcon, ViewsIcon } from "@plane/propel/icons";
import { EUserWorkspaceRoles } from "@plane/types";
// hooks
import useLocalStorage from "@/hooks/use-local-storage";
// local imports
import { SidebarWorkspaceMenuHeader } from "./workspace-menu-header";
import { SidebarWorkspaceMenuItem } from "./workspace-menu-item";

export function SidebarWorkspaceMenu() {
  // router params
  const { workspaceSlug } = useParams();
  // local storage
  const { setValue: toggleWorkspaceMenu, storedValue } = useLocalStorage<boolean>("is_workspace_menu_open", true);
  // derived values
  const isWorkspaceMenuOpen = !!storedValue;

  const SIDEBAR_WORKSPACE_MENU_ITEMS = [
    {
      key: "projects",
      labelTranslationKey: "sidebar.projects",
      href: `/${workspaceSlug}/projects/`,
      access: [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER, EUserWorkspaceRoles.GUEST],
      Icon: ProjectIcon,
    },
    {
      key: "views",
      labelTranslationKey: "sidebar.views",
      href: `/${workspaceSlug}/workspace-views/all-issues/`,
      access: [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER, EUserWorkspaceRoles.GUEST],
      Icon: ViewsIcon,
    },
    {
      key: "active-sprints",
      labelTranslationKey: "sidebar.sprints",
      href: `/${workspaceSlug}/active-sprints/`,
      access: [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER],
      Icon: SprintIcon,
    },
    {
      key: "resource_view",
      labelTranslationKey: "sidebar.resource_view",
      href: `/${workspaceSlug}/resource-view/`,
      access: [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER],
      Icon: TeamsIcon,
    },
    {
      key: "analytics",
      labelTranslationKey: "sidebar.analytics",
      href: `/${workspaceSlug}/analytics/`,
      access: [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER],
      Icon: AnalyticsIcon,
    },
  ];

  return (
    <Disclosure as="div" defaultOpen>
      <SidebarWorkspaceMenuHeader isWorkspaceMenuOpen={isWorkspaceMenuOpen} toggleWorkspaceMenu={toggleWorkspaceMenu} />
      <Transition
        as="div"
        show={isWorkspaceMenuOpen}
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        {isWorkspaceMenuOpen && (
          <Disclosure.Panel as="div" className="flex flex-col mt-0.5 gap-0.5" static>
            {SIDEBAR_WORKSPACE_MENU_ITEMS.map((item) => (
              <SidebarWorkspaceMenuItem key={item.key} item={item} />
            ))}
          </Disclosure.Panel>
        )}
      </Transition>
    </Disclosure>
  );
}

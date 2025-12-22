// hoc/withDockItems.tsx
import React from "react";
import { useParams } from "next/navigation";
import { PlaneNewIcon } from "@plane/propel/icons";
import type { AppSidebarItemData } from "@/components/sidebar/sidebar-item";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";

type WithDockItemsProps = {
  dockItems: (AppSidebarItemData & { shouldRender: boolean })[];
};

export function withDockItems<P extends WithDockItemsProps>(WrappedComponent: React.ComponentType<P>) {
  function ComponentWithDockItems(props: Omit<P, keyof WithDockItemsProps>) {
    const { workspaceSlug } = useParams();
    const { isProjectsPath, isNotificationsPath } = useWorkspacePaths();

    const dockItems: (AppSidebarItemData & { shouldRender: boolean })[] = [
      {
        label: "Projects",
        icon: <PlaneNewIcon className="size-5" />,
        href: `/${workspaceSlug}/`,
        isActive: isProjectsPath && !isNotificationsPath,
        shouldRender: true,
      },
    ];

    return <WrappedComponent {...(props as P)} dockItems={dockItems} />;
  }

  return ComponentWithDockItems;
}

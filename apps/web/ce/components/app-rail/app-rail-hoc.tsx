// hoc/withDockItems.tsx
import React from "react";
import { useParams } from "next/navigation";
import { BookOpen, FolderOpen } from "lucide-react";
import { PlaneNewIcon } from "@plane/propel/icons";
import type { AppSidebarItemData } from "@/components/sidebar/sidebar-item";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";

type WithDockItemsProps = {
  dockItems: (AppSidebarItemData & { shouldRender: boolean })[];
};

export function withDockItems<P extends WithDockItemsProps>(WrappedComponent: React.ComponentType<P>) {
  function ComponentWithDockItems(props: Omit<P, keyof WithDockItemsProps>) {
    const { workspaceSlug } = useParams();
    const { isProjectsPath, isWikiPath, isResourcesPath, isNotificationsPath } = useWorkspacePaths();

    const dockItems: (AppSidebarItemData & { shouldRender: boolean })[] = [
      {
        label: "Projects",
        icon: <PlaneNewIcon className="size-5" />,
        href: `/${workspaceSlug}/`,
        isActive: isProjectsPath && !isNotificationsPath,
        shouldRender: true,
      },
      {
        label: "Wiki",
        icon: <BookOpen className="size-5" />,
        href: `/${workspaceSlug}/wiki`,
        isActive: isWikiPath,
        shouldRender: true,
      },
      {
        label: "Resources",
        icon: <FolderOpen className="size-5" />,
        href: `/${workspaceSlug}/resources`,
        isActive: isResourcesPath,
        shouldRender: true,
      },
    ];

    return <WrappedComponent {...(props as P)} dockItems={dockItems} />;
  }

  return ComponentWithDockItems;
}

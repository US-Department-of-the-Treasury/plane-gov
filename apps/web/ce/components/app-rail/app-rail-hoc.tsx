// hoc/withDockItems.tsx
import React from "react";
import { BookOpen, FolderOpen } from "lucide-react";
import { PlaneNewIcon } from "@plane/propel/icons";
import type { TWorkspaceMode } from "@plane/types";
import type { AppSidebarItemData } from "@/components/sidebar/sidebar-item";
import { useModeNavigation } from "@/hooks/use-workspace-mode";

type WithDockItemsProps = {
  dockItems: (AppSidebarItemData & { shouldRender: boolean; mode: TWorkspaceMode })[];
};

const MODE_ICONS: Record<TWorkspaceMode, React.ReactNode> = {
  projects: <PlaneNewIcon className="size-5" />,
  wiki: <BookOpen className="size-5" />,
  resources: <FolderOpen className="size-5" />,
};

export function withDockItems<P extends WithDockItemsProps>(WrappedComponent: React.ComponentType<P>) {
  function ComponentWithDockItems(props: Omit<P, keyof WithDockItemsProps>) {
    const { currentMode, getModeHref, modes } = useModeNavigation();

    const dockItems: (AppSidebarItemData & { shouldRender: boolean; mode: TWorkspaceMode })[] = modes.map((mode) => ({
      label: mode.label,
      icon: MODE_ICONS[mode.key],
      href: getModeHref(mode.key),
      isActive: currentMode === mode.key,
      shouldRender: true,
      mode: mode.key,
    }));

    return <WrappedComponent {...(props as P)} dockItems={dockItems} />;
  }

  return ComponentWithDockItems;
}

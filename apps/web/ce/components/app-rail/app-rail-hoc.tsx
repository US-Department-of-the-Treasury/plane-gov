// hoc/withDockItems.tsx
import React from "react";
import { BookOpen, FolderOpen } from "lucide-react";
// eslint-disable-next-line import/no-unresolved -- @plane/propel/icons is a valid package export
import { PlaneNewIcon } from "@plane/propel/icons";
import type { TWorkspaceMode } from "@plane/types";
import type { AppSidebarItemData } from "@/components/sidebar/sidebar-item";
import { useModeNavigation } from "@/hooks/use-workspace-mode";

type DockItem = AppSidebarItemData & { shouldRender: boolean; mode: TWorkspaceMode };

type WithDockItemsProps = {
  dockItems: DockItem[];
};

/** Additional props passed through to the wrapped component */
type AdditionalProps = {
  showLabel?: boolean;
};

const MODE_ICONS: Record<TWorkspaceMode, React.ReactNode> = {
  projects: <PlaneNewIcon className="size-5" />,
  wiki: <BookOpen className="size-5" />,
  resources: <FolderOpen className="size-5" />,
};

export function withDockItems<P extends WithDockItemsProps & AdditionalProps>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<AdditionalProps> {
  function ComponentWithDockItems(props: AdditionalProps) {
    const { currentMode, getModeHref, modes } = useModeNavigation();

    const dockItems: (AppSidebarItemData & { shouldRender: boolean; mode: TWorkspaceMode })[] = modes.map((mode) => ({
      label: mode.label,
      icon: MODE_ICONS[mode.key],
      href: getModeHref(mode.key),
      isActive: currentMode === mode.key,
      shouldRender: true,
      mode: mode.key,
      shortcutKey: mode.shortcutKey,
    }));

    return <WrappedComponent {...(props as P)} dockItems={dockItems} />;
  }

  return ComponentWithDockItems;
}

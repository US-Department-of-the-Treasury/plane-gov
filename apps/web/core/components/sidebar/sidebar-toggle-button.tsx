import { PanelLeft } from "lucide-react";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { isSidebarToggleVisible } from "@/plane-web/components/desktop";
import { IconButton } from "@plane/propel/icon-button";

export function AppSidebarToggleButton() {
  // store hooks
  const { toggleSidebar, sidebarPeek, toggleSidebarPeek } = useAppTheme();

  if (!isSidebarToggleVisible()) return null;
  return (
    <IconButton
      size="base"
      variant="ghost"
      icon={PanelLeft}
      onClick={() => {
        if (sidebarPeek) toggleSidebarPeek(false);
        toggleSidebar();
      }}
    />
  );
}

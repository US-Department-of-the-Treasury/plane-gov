import { PanelLeft } from "lucide-react";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { isSidebarToggleVisible } from "@/plane-web/components/desktop";
import { IconButton } from "@plane/propel/icon-button";

type AppSidebarToggleButtonProps = {
  onToggle?: () => void;
};

export function AppSidebarToggleButton({ onToggle }: AppSidebarToggleButtonProps) {
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
        // Use custom toggle if provided, otherwise use default
        if (onToggle) {
          onToggle();
        } else {
          toggleSidebar();
        }
      }}
    />
  );
}

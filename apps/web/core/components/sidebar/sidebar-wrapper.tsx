import { useEffect, useRef } from "react";
// plane helpers
import { useOutsideClickDetector } from "@plane/hooks";
import { ScrollArea } from "@plane/propel/scrollarea";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import useSize from "@/hooks/use-window-size";
import { AppSidebarToggleButton } from "./sidebar-toggle-button";

type TSidebarWrapperProps = {
  title: string;
  children: React.ReactNode;
  quickActions?: React.ReactNode;
  headerActions?: React.ReactNode;
  onToggle?: () => void;
};

export function SidebarWrapper(props: TSidebarWrapperProps) {
  const { title, children, quickActions, headerActions, onToggle } = props;
  // store hooks
  const { toggleSidebar, sidebarCollapsed } = useAppTheme();
  const windowSize = useSize();
  // refs
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClickDetector(ref, () => {
    if (sidebarCollapsed === false && window.innerWidth < 768) {
      toggleSidebar();
    }
  });

  useEffect(() => {
    if (windowSize[0] < 768 && !sidebarCollapsed) toggleSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSize]);

  return (
    <div ref={ref} className="flex flex-col h-full w-full">
      <div className="flex flex-col gap-3 px-3">
        {/* Workspace switcher and settings */}

        <div className="flex items-center justify-between gap-2 px-2">
          <span className="text-16 text-primary font-medium pt-1">{title}</span>
          <div className="flex items-center gap-1">
            {headerActions}
            <AppSidebarToggleButton onToggle={onToggle} />
          </div>
        </div>
        {/* Quick actions */}
        {quickActions}
      </div>

      <ScrollArea
        orientation="vertical"
        scrollType="hover"
        size="sm"
        rootClassName="size-full overflow-x-hidden overflow-y-auto"
        viewportClassName="flex flex-col gap-3 overflow-x-hidden h-full w-full overflow-y-auto px-3 pt-3 pb-0.5"
      >
        {children}
      </ScrollArea>
    </div>
  );
}

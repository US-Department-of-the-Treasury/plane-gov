import { observer } from "mobx-react";
// ui
import { useTranslation } from "@plane/i18n";
import { Tooltip } from "@plane/propel/tooltip";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
import packageJson from "package.json";

export const WorkspaceEditionBadge = observer(function WorkspaceEditionBadge() {
  // translation
  const { t } = useTranslation();
  // platform
  const { isMobile } = usePlatformOS();

  return (
    <Tooltip tooltipContent={`Version: v${packageJson.version}`} isMobile={isMobile}>
      <span
        className="inline-flex items-center rounded-md bg-custom-background-80 px-2 py-1 text-xs font-medium text-custom-text-200"
        aria-label={t("aria_labels.projects_sidebar.edition_badge")}
      >
        Community
      </span>
    </Tooltip>
  );
});

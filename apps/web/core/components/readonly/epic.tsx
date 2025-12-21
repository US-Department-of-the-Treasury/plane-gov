import { useEffect } from "react";
import { observer } from "mobx-react";
import { Layers } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// hooks
import { useEpic } from "@/hooks/store/use-epic";

export type TReadonlyEpicProps = {
  className?: string;
  hideIcon?: boolean;
  value: string | string[] | null;
  placeholder?: string;
  projectId: string | undefined;
  multiple?: boolean;
  showCount?: boolean;
  workspaceSlug: string;
};

export const ReadonlyEpic = observer(function ReadonlyEpic(props: TReadonlyEpicProps) {
  const {
    className,
    hideIcon = false,
    value,
    placeholder,
    multiple = false,
    showCount = true,
    workspaceSlug,
    projectId,
  } = props;

  const { t } = useTranslation();
  const { getEpicById, fetchEpics } = useEpic();

  const epicIds = Array.isArray(value) ? value : value ? [value] : [];
  const epics = epicIds.map((id) => getEpicById(id)).filter(Boolean);

  useEffect(() => {
    if (epicIds.length > 0 && projectId) {
      fetchEpics(workspaceSlug, projectId);
    }
  }, [value, projectId, workspaceSlug]);

  if (epics.length === 0) {
    return (
      <div className={cn("flex items-center gap-1 text-body-xs-regular", className)}>
        {!hideIcon && <Layers className="size-4 flex-shrink-0" />}
        <span className="flex-grow truncate">{placeholder ?? t("common.none")}</span>
      </div>
    );
  }

  if (multiple) {
    const displayText =
      showCount && epics.length > 1 ? `${epics[0]?.name} +${epics.length - 1}` : epics[0]?.name;

    return (
      <div className={cn("flex items-center gap-1 text-body-xs-regular", className)}>
        {!hideIcon && <Layers className="size-4 flex-shrink-0" />}
        <span className="flex-grow truncate">{displayText}</span>
      </div>
    );
  }

  const epicItem = epics[0];
  return (
    <div className={cn("flex items-center gap-2 text-body-xs-regular", className)}>
      {!hideIcon && <Layers className="size-4 flex-shrink-0" />}
      <span className="flex-grow truncate">{epicItem?.name}</span>
    </div>
  );
});

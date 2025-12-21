import { useEffect } from "react";
import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { SprintIcon } from "@plane/propel/icons";
import { cn } from "@plane/utils";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";

export type TReadonlySprintProps = {
  className?: string;
  hideIcon?: boolean;
  value: string | null;
  placeholder?: string;
  projectId: string | undefined;
  workspaceSlug: string;
};

export const ReadonlySprint = observer(function ReadonlySprint(props: TReadonlySprintProps) {
  const { className, hideIcon = false, value, placeholder, projectId, workspaceSlug } = props;

  const { t } = useTranslation();
  const { getSprintNameById, fetchAllSprints } = useSprint();
  const sprintName = value ? getSprintNameById(value) : null;

  useEffect(() => {
    if (projectId) {
      fetchAllSprints(workspaceSlug, projectId);
    }
  }, [projectId, workspaceSlug]);

  return (
    <div className={cn("flex items-center gap-1 text-13", className)}>
      {!hideIcon && <SprintIcon className="size-4 flex-shrink-0" />}
      <span className="flex-grow truncate">{sprintName ?? placeholder ?? t("common.none")}</span>
    </div>
  );
});

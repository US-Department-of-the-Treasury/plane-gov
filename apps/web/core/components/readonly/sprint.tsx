// plane imports
import { useTranslation } from "@plane/i18n";
import { SprintIcon } from "@plane/propel/icons";
import { cn } from "@plane/utils";
// hooks
import { useProjectSprints, getSprintNameById } from "@/store/queries/sprint";

export type TReadonlySprintProps = {
  className?: string;
  hideIcon?: boolean;
  value: string | null;
  placeholder?: string;
  projectId: string | undefined;
  workspaceSlug: string;
};

export function ReadonlySprint(props: TReadonlySprintProps) {
  const { className, hideIcon = false, value, placeholder, projectId, workspaceSlug } = props;

  const { t } = useTranslation();
  const { data: sprints } = useProjectSprints(workspaceSlug, projectId || "");
  const sprintName = value ? getSprintNameById(sprints, value) : null;

  return (
    <div className={cn("flex items-center gap-1 text-13", className)}>
      {!hideIcon && <SprintIcon className="size-4 flex-shrink-0" />}
      <span className="flex-grow truncate">{sprintName ?? placeholder ?? t("common.none")}</span>
    </div>
  );
}

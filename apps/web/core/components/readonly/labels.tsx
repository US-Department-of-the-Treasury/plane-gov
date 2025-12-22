// plane imports
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
// hooks
import { useProjectLabels } from "@/store/queries/label";
import { usePlatformOS } from "@/hooks/use-platform-os";

export type TReadonlyLabelsProps = {
  className?: string;
  hideIcon?: boolean;
  value: string[];
  placeholder?: string;
  projectId: string | undefined;
  workspaceSlug: string;
};

export function ReadonlyLabels(props: TReadonlyLabelsProps) {
  const { className, value, projectId, workspaceSlug } = props;

  // TanStack Query auto-fetches project labels
  const { data: projectLabels } = useProjectLabels(workspaceSlug, projectId || "");
  const { isMobile } = usePlatformOS();
  const labels = value
    .map((labelId) => projectLabels?.find((l) => l.id === labelId))
    .filter((label): label is NonNullable<typeof label> => Boolean(label));

  return (
    <div className={cn("flex items-center gap-2 text-body-xs-regular", className)}>
      {labels && (
        <>
          <Tooltip
            position="top"
            tooltipHeading="Labels"
            tooltipContent={labels.map((l) => l?.name).join(", ")}
            isMobile={isMobile}
            disabled={labels.length === 0}
          >
            <div className="h-full flex items-center gap-1 rounded-sm py-1 text-body-xs-bold">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent-primary" />
              <span>{value.length}</span>
              <span>Labels</span>
            </div>
          </Tooltip>
        </>
      )}
    </div>
  );
}

// plane ui
import { SprintIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
// plane utils
import { cn } from "@plane/utils";
// store
import { useAnchor } from "@/store/anchor-context";
import { useSprints } from "@/store/queries";

type Props = {
  sprintId: string | undefined;
  shouldShowBorder?: boolean;
};

export function IssueBlockSprint({ sprintId, shouldShowBorder = true }: Props) {
  // hooks
  const anchor = useAnchor();
  const { getSprintById } = useSprints(anchor);

  const sprint = getSprintById(sprintId);

  return (
    <Tooltip tooltipHeading="Sprint" tooltipContent={sprint?.name ?? "No Sprint"}>
      <div
        className={cn(
          "flex h-full w-full items-center justify-between gap-1 rounded-sm px-2.5 py-1 text-11  duration-300 focus:outline-none",
          { "border-[0.5px] border-strong": shouldShowBorder }
        )}
      >
        <div className="flex w-full items-center text-11 gap-1.5">
          <SprintIcon className="h-3 w-3 flex-shrink-0" />
          <div className="max-w-40 flex-grow truncate ">{sprint?.name ?? "No Sprint"}</div>
        </div>
      </div>
    </Tooltip>
  );
}

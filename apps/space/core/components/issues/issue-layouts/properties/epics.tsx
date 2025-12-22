// plane ui
import { EpicIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
// plane utils
import { cn } from "@plane/utils";
// store
import { useAnchor } from "@/store/anchor-context";
import { useEpics } from "@/store/queries";

type Props = {
  epicIds: string[] | undefined;
  shouldShowBorder?: boolean;
};

export function IssueBlockEpics({ epicIds, shouldShowBorder = true }: Props) {
  // hooks
  const anchor = useAnchor();
  const { getEpicsByIds } = useEpics(anchor);

  const epics = getEpicsByIds(epicIds ?? []);

  const epicsString = epics.map((epic) => epic.name).join(", ");

  return (
    <div className="relative flex h-full flex-wrap items-center gap-1">
      <Tooltip tooltipHeading="Epics" tooltipContent={epicsString}>
        {epics.length <= 1 ? (
          <div
            key={epics?.[0]?.id}
            className={cn("flex h-full flex-shrink-0 cursor-default items-center rounded-md px-2.5 py-1 text-11", {
              "border-[0.5px] border-strong": shouldShowBorder,
            })}
          >
            <div className="flex items-center gap-1.5 text-secondary">
              <EpicIcon className="h-3 w-3 flex-shrink-0" />
              <div className="text-11">{epics?.[0]?.name ?? "No Epics"}</div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-shrink-0 cursor-default items-center rounded-md border border-strong px-2.5 py-1 text-11">
            <div className="flex items-center gap-1.5 text-secondary">
              <div className="text-11">{epics.length} Epics</div>
            </div>
          </div>
        )}
      </Tooltip>
    </div>
  );
}

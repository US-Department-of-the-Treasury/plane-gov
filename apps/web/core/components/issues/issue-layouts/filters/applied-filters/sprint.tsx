import { observer } from "mobx-react";
import { CloseIcon, SprintGroupIcon } from "@plane/propel/icons";
import type { TSprintGroups } from "@plane/types";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
// ui
// types

type Props = {
  handleRemove: (val: string) => void;
  values: string[];
  editable: boolean | undefined;
};

export const AppliedSprintFilters = observer(function AppliedSprintFilters(props: Props) {
  const { handleRemove, values, editable } = props;
  // store hooks
  const { getSprintById } = useSprint();

  return (
    <>
      {values.map((sprintId) => {
        const sprintDetails = getSprintById(sprintId) ?? null;

        if (!sprintDetails) return null;

        const sprintStatus = (sprintDetails?.status ? sprintDetails?.status.toLocaleLowerCase() : "draft") as TSprintGroups;

        return (
          <div key={sprintId} className="flex items-center gap-1 rounded-sm bg-layer-1 p-1 text-11 truncate">
            <SprintGroupIcon sprintGroup={sprintStatus} className="h-3 w-3 flex-shrink-0" />
            <span className="normal-case truncate">{sprintDetails.name}</span>
            {editable && (
              <button
                type="button"
                className="grid place-items-center text-tertiary hover:text-secondary"
                onClick={() => handleRemove(sprintId)}
              >
                <CloseIcon height={10} width={10} strokeWidth={2} />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
});

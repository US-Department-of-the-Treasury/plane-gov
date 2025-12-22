import { observer } from "mobx-react";
// hooks
import { CloseIcon, EpicIcon } from "@plane/propel/icons";
import { useEpic } from "@/hooks/store/use-epic";
// ui

type Props = {
  handleRemove: (val: string) => void;
  values: string[];
  editable: boolean | undefined;
};

export const AppliedEpicFilters = observer(function AppliedEpicFilters(props: Props) {
  const { handleRemove, values, editable } = props;
  // store hooks
  const { getEpicById } = useEpic();

  return (
    <>
      {values.map((epicId) => {
        const epicDetails = getEpicById(epicId) ?? null;

        if (!epicDetails) return null;

        return (
          <div key={epicId} className="flex items-center gap-1 rounded-sm bg-layer-1 p-1 text-11 truncate">
            <EpicIcon className="h-3 w-3 flex-shrink-0" />
            <span className="normal-case truncate">{epicDetails.name}</span>
            {editable && (
              <button
                type="button"
                className="grid place-items-center text-tertiary hover:text-secondary"
                onClick={() => handleRemove(epicId)}
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

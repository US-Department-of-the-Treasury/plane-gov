// plane imports
import { EIconSize } from "@plane/constants";
import { CloseIcon, StateGroupIcon } from "@plane/propel/icons";
// store
import { useAnchor } from "@/store/anchor-context";
import { useStates } from "@/store/queries";

type Props = {
  handleRemove: (val: string) => void;
  values: string[];
};

export function AppliedStateFilters(props: Props) {
  const { handleRemove, values } = props;

  // hooks
  const anchor = useAnchor();
  const { sortedStates: states } = useStates(anchor);

  return (
    <>
      {values.map((stateId) => {
        const stateDetails = states?.find((s) => s.id === stateId);

        if (!stateDetails) return null;

        return (
          <div key={stateId} className="flex items-center gap-1 rounded-sm bg-layer-3 p-1 text-11">
            <StateGroupIcon color={stateDetails.color} stateGroup={stateDetails.group} size={EIconSize.SM} />
            {stateDetails.name}
            <button
              type="button"
              className="grid place-items-center text-tertiary hover:text-secondary"
              onClick={() => handleRemove(stateId)}
            >
              <CloseIcon height={10} width={10} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </>
  );
}

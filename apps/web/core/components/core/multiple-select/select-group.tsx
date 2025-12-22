// hooks
import type { TSelectionHelper } from "@/hooks/use-multiple-select";
import { useMultipleSelect } from "@/hooks/use-multiple-select";

type Props = {
  children: (helpers: TSelectionHelper) => React.ReactNode;
  containerRef: React.MutableRefObject<HTMLElement | null>;
  disabled?: boolean;
  entities: Record<string, string[]>; // { groupID: entityIds[] }
};

export function MultipleSelectGroup(props: Props) {
  const { children, containerRef, disabled = false, entities } = props;

  const helpers = useMultipleSelect({
    containerRef,
    disabled,
    entities,
  });

  return <>{children(helpers)}</>;
}

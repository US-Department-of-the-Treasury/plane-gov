import { Button } from "@plane/propel/button";
import { CloseIcon, LabelFilledIcon } from "@plane/propel/icons";
// types
import { useProjectLabels } from "@/store/queries/label";
import type { TLabelOperations } from "./root";

type TLabelListItem = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  labelId: string;
  values: string[];
  labelOperations: TLabelOperations;
  disabled: boolean;
};

export function LabelListItem(props: TLabelListItem) {
  const { workspaceSlug, projectId, issueId, labelId, values, labelOperations, disabled } = props;
  // hooks
  const { data: labels } = useProjectLabels(workspaceSlug, projectId);

  const label = labels?.find((l) => l.id === labelId);

  const handleLabel = async () => {
    if (values && !disabled) {
      const currentLabels = values.filter((_labelId) => _labelId !== labelId);
      await labelOperations.updateIssue(workspaceSlug, projectId, issueId, { label_ids: currentLabels });
    }
  };

  if (!label) return <></>;
  return (
    <Button variant="tertiary" size="sm" key={labelId} onClick={handleLabel} disabled={disabled}>
      <LabelFilledIcon className="size-3" color={label.color ?? "#000000"} />
      <span className="text-body-xs-regular">{label.name}</span>
      {!disabled && <CloseIcon className="transition-all h-2.5 w-2.5 group-hover:text-danger" />}
    </Button>
  );
}

import { useParams } from "next/navigation";
// plane types
import type { IIssueLabel, TIssue } from "@plane/types";
import { Spinner } from "@plane/ui";
// components
import { PowerKLabelsMenu } from "@/components/power-k/menus/labels";
// hooks
import { useProjectLabels } from "@/store/queries/label";

type Props = {
  handleSelect: (label: IIssueLabel) => void;
  workItemDetails: TIssue;
};

export function PowerKWorkItemLabelsMenu(props: Props) {
  const { handleSelect, workItemDetails } = props;
  // hooks
  const { workspaceSlug } = useParams();
  const { data: projectLabels, isLoading } = useProjectLabels(
    workspaceSlug?.toString() ?? "",
    workItemDetails.project_id ?? ""
  );

  if (isLoading || !projectLabels) return <Spinner />;

  return <PowerKLabelsMenu labels={projectLabels} onSelect={handleSelect} value={workItemDetails.label_ids} />;
}

import { useParams } from "next/navigation";
import { LabelPropertyIcon } from "@plane/propel/icons";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
import { useWorkspaceLabels } from "@/store/queries/label";
// components
import { IssueActivityBlockComponent, IssueLink, LabelActivityChip } from "./";

type TIssueLabelActivity = { activityId: string; showIssue?: boolean; ends: "top" | "bottom" | undefined };

export function IssueLabelActivity(props: TIssueLabelActivity) {
  const { activityId, showIssue = true, ends } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: labels } = useWorkspaceLabels(workspaceSlug);

  const activity = getActivityById(activityId);
  const oldLabelColor = labels?.find((l) => l.id === activity?.old_identifier)?.color;
  const newLabelColor = labels?.find((l) => l.id === activity?.new_identifier)?.color;

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={<LabelPropertyIcon height={14} width={14} className="text-secondary" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {activity.old_value === "" ? `added a new label ` : `removed the label `}
        <LabelActivityChip
          name={activity.old_value === "" ? activity.new_value : activity.old_value}
          color={activity.old_value === "" ? newLabelColor : oldLabelColor}
        />
        {showIssue && (activity.old_value === "" ? ` to ` : ` from `)}
        {showIssue && <IssueLink activityId={activityId} />}
      </>
    </IssueActivityBlockComponent>
  );
}

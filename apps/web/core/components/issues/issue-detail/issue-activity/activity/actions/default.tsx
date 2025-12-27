// plane imports
import { WorkItemsIcon } from "@plane/propel/icons";
import { EInboxIssueSource } from "@plane/types";
import { capitalizeFirstLetter } from "@plane/utils";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
// components
import { IssueActivityBlockComponent } from "./";

type TIssueDefaultActivity = { activityId: string; ends: "top" | "bottom" | undefined };

export function IssueDefaultActivity(props: TIssueDefaultActivity) {
  const { activityId, ends } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);

  const activity = getActivityById(activityId);

  if (!activity) return <></>;
  const source = activity.source_data?.source;

  return (
    <IssueActivityBlockComponent
      activityId={activityId}
      icon={<WorkItemsIcon width={14} height={14} className="text-secondary" aria-hidden="true" />}
      ends={ends}
    >
      <>
        {activity.verb === "created" ? (
          source && source !== EInboxIssueSource.IN_APP ? (
            <span>
              created the work item via{" "}
              <span className="font-medium">{capitalizeFirstLetter(source.toLowerCase() || "")}</span>.
            </span>
          ) : (
            <span> created the work item.</span>
          )
        ) : (
          <span> deleted a work item.</span>
        )}
      </>
    </IssueActivityBlockComponent>
  );
}

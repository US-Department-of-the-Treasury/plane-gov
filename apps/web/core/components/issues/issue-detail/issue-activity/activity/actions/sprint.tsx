import { SprintIcon } from "@plane/propel/icons";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
// components
import { IssueActivityBlockComponent } from "./";

type TIssueSprintActivity = { activityId: string; ends: "top" | "bottom" | undefined };

export function IssueSprintActivity(props: TIssueSprintActivity) {
  const { activityId, ends } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);

  const activity = getActivityById(activityId);

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={<SprintIcon className="h-4 w-4 flex-shrink-0 text-secondary" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {activity.verb === "created" ? (
          <>
            <span>added this work item to the sprint </span>
            <a
              href={`/${activity.workspace_detail?.slug}/projects/${activity.project}/sprints/${activity.new_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate font-medium text-primary hover:underline"
            >
              <span className="truncate">{activity.new_value}</span>
            </a>
          </>
        ) : activity.verb === "updated" ? (
          <>
            <span>set the sprint to </span>
            <a
              href={`/${activity.workspace_detail?.slug}/projects/${activity.project}/sprints/${activity.new_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate font-medium text-primary hover:underline"
            >
              <span className="truncate"> {activity.new_value}</span>
            </a>
          </>
        ) : (
          <>
            <span>removed the work item from the sprint </span>
            <a
              href={`/${activity.workspace_detail?.slug}/projects/${activity.project}/sprints/${activity.old_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate font-medium text-primary hover:underline"
            >
              <span className="truncate"> {activity.new_value}</span>
            </a>
          </>
        )}
      </>
    </IssueActivityBlockComponent>
  );
}

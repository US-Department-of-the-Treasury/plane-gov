import type { FC } from "react";
import type { TProjectActivity } from "@/plane-web/types";
import { ActivityBlockComponent } from "./activity-block";
import { iconsMap, messages } from "./helper";

type TActivityItem = {
  activity: TProjectActivity;
  showProject?: boolean;
  ends?: "top" | "bottom" | undefined;
  workspaceSlug: string;
};

export function ActivityItem(props: TActivityItem) {
  const { activity, showProject = true, ends, workspaceSlug } = props;

  if (!activity) return null;

  const activityType = activity.field;
  if (!activityType) return null;

  const { message, customUserName } = messages(activity);
  const icon = iconsMap[activityType] || iconsMap.default;

  return (
    <ActivityBlockComponent icon={icon} activity={activity} ends={ends} customUserName={customUserName} workspaceSlug={workspaceSlug}>
      <>{message}</>
    </ActivityBlockComponent>
  );
}

import Link from "next/link";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";

type TIssueUser = {
  activityId: string;
  customUserName?: string;
};

export function IssueUser(props: TIssueUser) {
  const { activityId, customUserName } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);

  const activity = getActivityById(activityId);

  if (!activity) return <></>;

  return (
    <>
      {customUserName ? (
        <span className="text-primary font-medium">{customUserName}</span>
      ) : (
        <Link
          href={`/${activity?.workspace_detail?.slug}/profile/${activity?.actor_detail?.id}`}
          className="hover:underline text-primary font-medium"
        >
          {activity.actor_detail?.display_name}
        </Link>
      )}
    </>
  );
}

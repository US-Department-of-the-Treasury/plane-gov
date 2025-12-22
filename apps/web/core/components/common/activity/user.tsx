import type { FC } from "react";
import Link from "next/link";
// types
import type { TWorkspaceBaseActivity } from "@plane/types";
// store hooks
import { useWorkspaceMembers, getWorkspaceMemberByUserId, getMemberDisplayName } from "@/store/queries/member";
import { useWorkspaces, getWorkspaceById } from "@/store/queries/workspace";

type TUser = {
  activity: TWorkspaceBaseActivity;
  customUserName?: string;
  workspaceSlug: string;
};

export function User(props: TUser) {
  const { activity, customUserName, workspaceSlug } = props;
  // store hooks
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  const { data: workspaces } = useWorkspaces();
  // derived values
  const actorDetail = getWorkspaceMemberByUserId(members, activity.actor);
  const workspaceDetail = getWorkspaceById(workspaces, activity.workspace);
  const displayName = actorDetail ? getMemberDisplayName(actorDetail) : "";

  return (
    <>
      {customUserName || displayName.includes("-intake") ? (
        <span className="text-primary font-medium">{customUserName || "Plane"}</span>
      ) : (
        <Link
          href={`/${workspaceDetail?.slug}/profile/${actorDetail?.id}`}
          className="hover:underline text-primary font-medium"
        >
          {displayName}
        </Link>
      )}
    </>
  );
}

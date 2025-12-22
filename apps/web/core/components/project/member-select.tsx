import React from "react";
import { useParams } from "next/navigation";
import { Ban } from "lucide-react";
import { EUserProjectRoles } from "@plane/types";
// plane ui
import { Avatar, CustomSearchSelect } from "@plane/ui";
// helpers
import { getFileURL } from "@plane/utils";
// queries
import { useProjectMembers, useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";

type Props = {
  value: any;
  onChange: (val: string) => void;
  isDisabled?: boolean;
};

export function MemberSelect(props: Props) {
  const { value, onChange, isDisabled = false } = props;
  // router
  const { projectId, workspaceSlug } = useParams();
  // queries
  const { data: projectMembers = [] } = useProjectMembers(workspaceSlug, projectId);
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString() ?? "");

  const options = projectMembers
    ?.map((memberDetails) => {
      if (!memberDetails?.member) return;
      const workspaceMember = getWorkspaceMemberByUserId(workspaceMembers, memberDetails.member);
      if (!workspaceMember?.member) return;
      const isGuest = memberDetails.role === EUserProjectRoles.GUEST;
      if (isGuest) return;

      return {
        value: `${workspaceMember.member.id}`,
        query: `${workspaceMember.member.display_name}`,
        content: (
          <div className="flex items-center gap-2">
            <Avatar name={workspaceMember.member.display_name} src={getFileURL(workspaceMember.member.avatar_url)} />
            {workspaceMember.member.display_name}
          </div>
        ),
      };
    })
    .filter((option) => !!option) as
    | {
        value: string;
        query: string;
        content: React.ReactNode;
      }[]
    | undefined;
  const selectedProjectMember = projectMembers.find((m) => m.member === value);
  const selectedOption = selectedProjectMember
    ? getWorkspaceMemberByUserId(workspaceMembers, selectedProjectMember.member)
    : undefined;

  return (
    <CustomSearchSelect
      value={value}
      label={
        <div className="flex items-center gap-2 h-3.5">
          {selectedOption?.member && (
            <Avatar name={selectedOption.member.display_name} src={getFileURL(selectedOption.member.avatar_url)} />
          )}
          {selectedOption?.member ? (
            selectedOption.member.display_name
          ) : (
            <div className="flex items-center gap-2">
              <Ban className="h-3.5 w-3.5 rotate-90 text-placeholder" />
              <span className="text-13 text-placeholder">None</span>
            </div>
          )}
        </div>
      }
      buttonClassName="!px-3 !py-2 bg-surface-1"
      options={
        options &&
        options && [
          ...options,
          {
            value: "none",
            query: "none",
            content: (
              <div className="flex items-center gap-2">
                <Ban className="h-3.5 w-3.5 rotate-90 text-placeholder" />
                <span className="py-0.5 text-13 text-placeholder">None</span>
              </div>
            ),
          },
        ]
      }
      maxHeight="md"
      onChange={onChange}
      disabled={isDisabled}
    />
  );
}

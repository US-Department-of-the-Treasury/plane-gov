import { useParams } from "next/navigation";
import { CloseIcon } from "@plane/propel/icons";
// plane ui
import { Avatar } from "@plane/ui";
// helpers
import { getFileURL } from "@plane/utils";
// hooks
import { useWorkspaceMembers, getWorkspaceMemberById } from "@/store/queries/member";

type Props = {
  handleRemove: (val: string) => void;
  values: string[];
  editable: boolean | undefined;
};

export function AppliedMembersFilters(props: Props) {
  const { handleRemove, values, editable } = props;
  // params
  const { workspaceSlug } = useParams();
  // hooks
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString() ?? "");

  return (
    <>
      {values.map((memberId) => {
        const workspaceMember = getWorkspaceMemberById(workspaceMembers, memberId);
        const memberDetails = workspaceMember?.member;

        if (!memberDetails) return null;

        return (
          <div key={memberId} className="flex items-center gap-1 rounded-sm bg-layer-1 p-1 text-11">
            <Avatar
              name={memberDetails.display_name}
              src={getFileURL(memberDetails.avatar_url)}
              showTooltip={false}
              size={"sm"}
            />
            <span className="normal-case">{memberDetails.display_name}</span>
            {editable && (
              <button
                type="button"
                className="grid place-items-center text-tertiary hover:text-secondary"
                onClick={() => handleRemove(memberId)}
              >
                <CloseIcon height={10} width={10} strokeWidth={2} />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

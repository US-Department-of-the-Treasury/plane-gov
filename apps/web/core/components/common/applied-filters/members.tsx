import { CloseIcon } from "@plane/propel/icons";
// plane ui
import { Avatar } from "@plane/ui";
// helpers
import { getFileURL } from "@plane/utils";
// hooks
import { useWorkspaceMembers, getWorkspaceMemberById, getMemberDisplayName } from "@/store/queries/member";

type Props = {
  handleRemove: (val: string) => void;
  values: string[];
  editable: boolean | undefined;
  workspaceSlug: string;
};

export function AppliedMembersFilters(props: Props) {
  const { handleRemove, values, editable, workspaceSlug } = props;
  // store hooks
  const { data: members } = useWorkspaceMembers(workspaceSlug);

  return (
    <>
      {values.map((memberId) => {
        const memberDetails = getWorkspaceMemberById(members, memberId);

        if (!memberDetails) return null;

        const displayName = getMemberDisplayName(memberDetails);

        return (
          <div key={memberId} className="flex items-center gap-1 rounded-sm bg-layer-1 py-1 px-1.5 text-11">
            <Avatar name={displayName} src={getFileURL(memberDetails.avatar_url ?? "")} showTooltip={false} size={"sm"} />
            <span className="normal-case">{displayName}</span>
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

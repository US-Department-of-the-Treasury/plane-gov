// helpers
import { cn } from "@plane/utils";
// store
import { useAnchor } from "@/store/anchor-context";
import { useCurrentUser, useMembers } from "@/store/queries";

type Props = {
  id: string;
};

export function EditorUserMention(props: Props) {
  const { id } = props;
  // hooks
  const anchor = useAnchor();
  const { data: currentUser } = useCurrentUser();
  const { getMemberById } = useMembers(anchor);
  // derived values
  const userDetails = getMemberById(id);

  if (!userDetails) {
    return (
      <div className="not-prose inline px-1 py-0.5 rounded-sm bg-layer-1 text-tertiary no-underline">
        @deactivated user
      </div>
    );
  }

  return (
    <div
      className={cn("not-prose inline px-1 py-0.5 rounded-sm bg-accent-primary/20 text-accent-primary no-underline", {
        "bg-yellow-500/20 text-yellow-500": id === currentUser?.id,
      })}
    >
      @{userDetails?.member__display_name}
    </div>
  );
}

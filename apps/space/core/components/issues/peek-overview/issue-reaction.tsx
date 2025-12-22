// components
import { IssueEmojiReactions } from "@/components/issues/reactions/issue-emoji-reactions";
import { IssueVotes } from "@/components/issues/reactions/issue-vote-reactions";
// hooks
import useIsInIframe from "@/hooks/use-is-in-iframe";
// store
import { usePublishSettings } from "@/store/queries";

type Props = {
  anchor: string;
};

export function IssueReactions(props: Props) {
  const { anchor } = props;
  // store
  const { canVote, canReact } = usePublishSettings(anchor);
  const isInIframe = useIsInIframe();

  return (
    <div className="mt-4 flex items-center gap-3">
      {canVote && (
        <div className="flex items-center gap-2">
          <IssueVotes anchor={anchor} />
        </div>
      )}
      {!isInIframe && canReact && (
        <div className="flex items-center gap-2">
          <IssueEmojiReactions anchor={anchor} />
        </div>
      )}
    </div>
  );
}

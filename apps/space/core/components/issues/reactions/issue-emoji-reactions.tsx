import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// lib
import { stringToEmoji } from "@plane/propel/emoji-icon-picker";
import { EmojiReactionGroup, EmojiReactionPicker } from "@plane/propel/emoji-reaction";
import type { EmojiReactionType } from "@plane/propel/emoji-reaction";
// helpers
import { groupReactions } from "@/helpers/emoji.helper";
import { queryParamGenerator } from "@/helpers/query-param-generator";
// store
import { useCurrentUser, useIssue, useAddReaction, useRemoveReaction } from "@/store/queries";
import { usePeekStore } from "@/store/peek.store";

type IssueEmojiReactionsProps = {
  anchor: string;
  issueIdFromProps?: string;
};

export function IssueEmojiReactions(props: IssueEmojiReactionsProps) {
  const { anchor, issueIdFromProps } = props;
  // state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // router
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  // query params
  const peekIdParam = searchParams.get("peekId") || undefined;
  const board = searchParams.get("board") || undefined;
  const state = searchParams.get("state") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const labels = searchParams.get("labels") || undefined;
  // store
  const { peekId: peekIdFromStore } = usePeekStore();
  const { data: user } = useCurrentUser();
  const addReactionMutation = useAddReaction();
  const removeReactionMutation = useRemoveReaction();

  const issueId = issueIdFromProps ?? peekIdFromStore;
  const { data: issueDetails } = useIssue(anchor, issueId ?? "");
  const reactions = issueDetails?.reaction_items ?? [];
  const groupedReactions = groupReactions(reactions, "reaction");
  const peekId = peekIdParam ?? peekIdFromStore;

  const userReactions = reactions.filter((r) => r.actor_details?.id === user?.id);

  const handleAddReaction = (reactionHex: string) => {
    if (!issueId) return;
    addReactionMutation.mutate({ anchor, issueId, data: { reaction: reactionHex } });
  };

  const handleRemoveReaction = (reactionHex: string) => {
    if (!issueId) return;
    removeReactionMutation.mutate({ anchor, issueId, reactionId: reactionHex });
  };

  const handleReactionClick = (reactionHex: string) => {
    const userReaction = userReactions?.find((r) => r.actor_details?.id === user?.id && r.reaction === reactionHex);
    if (userReaction) handleRemoveReaction(reactionHex);
    else handleAddReaction(reactionHex);
  };

  // derived values
  const { queryParam } = queryParamGenerator({ peekId, board, state, priority, labels });

  // Transform reactions data to Propel EmojiReactionType format
  const propelReactions: EmojiReactionType[] = useMemo(() => {
    const REACTIONS_LIMIT = 1000;

    return Object.keys(groupedReactions || {})
      .filter((reaction) => groupedReactions?.[reaction]?.length > 0)
      .map((reaction) => {
        const reactionList = groupedReactions?.[reaction] ?? [];
        const userNames = reactionList
          .map((r) => r?.actor_details?.display_name)
          .filter((name): name is string => !!name)
          .slice(0, REACTIONS_LIMIT);

        return {
          emoji: stringToEmoji(reaction),
          count: reactionList.length,
          reacted: reactionList.some((r) => r?.actor_details?.id === user?.id && r.reaction === reaction),
          users: userNames,
        };
      });
  }, [groupedReactions, user?.id]);

  const handleEmojiClick = (emoji: string) => {
    if (!user) {
      router.push(`/?next_path=${pathName}?${queryParam}`);
      return;
    }
    // Convert emoji back to decimal string format for the API
    const emojiCodePoints = Array.from(emoji).map((char) => char.codePointAt(0));
    const reactionString = emojiCodePoints.join("-");
    handleReactionClick(reactionString);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!user) {
      router.push(`/?next_path=${pathName}?${queryParam}`);
      return;
    }
    // emoji is already in decimal string format from EmojiReactionPicker
    handleReactionClick(emoji);
  };

  return (
    <EmojiReactionPicker
      isOpen={isPickerOpen}
      handleToggle={setIsPickerOpen}
      onChange={handleEmojiSelect}
      label={
        <EmojiReactionGroup
          reactions={propelReactions}
          onReactionClick={handleEmojiClick}
          showAddButton
          onAddReaction={() => setIsPickerOpen(true)}
        />
      }
      placement="bottom-start"
    />
  );
}

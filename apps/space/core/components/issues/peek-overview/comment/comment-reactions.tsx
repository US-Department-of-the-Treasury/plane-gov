import React, { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// plane imports
import { stringToEmoji } from "@plane/propel/emoji-icon-picker";
import { EmojiReactionGroup, EmojiReactionPicker } from "@plane/propel/emoji-reaction";
import type { EmojiReactionType } from "@plane/propel/emoji-reaction";
import type { TIssuePublicComment } from "@plane/types";
// helpers
import { groupReactions } from "@/helpers/emoji.helper";
import { queryParamGenerator } from "@/helpers/query-param-generator";

// Type for comment reactions from TIssuePublicComment
type TPublicCommentReaction = TIssuePublicComment["comment_reactions"][number];
// hooks
import useIsInIframe from "@/hooks/use-is-in-iframe";
// store
import { useCurrentUser, useIssueComments, useAddCommentReaction, useRemoveCommentReaction } from "@/store/queries";
import { usePeekStore } from "@/store/peek.store";

type Props = {
  anchor: string;
  commentId: string;
};

export function CommentReactions(props: Props) {
  const { anchor, commentId } = props;
  // state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  // query params
  const board = searchParams.get("board") || undefined;
  const state = searchParams.get("state") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const labels = searchParams.get("labels") || undefined;

  // store
  const { peekId } = usePeekStore();
  const { data: user } = useCurrentUser();
  const { data: comments = [] } = useIssueComments(anchor, peekId ?? "");
  const addReactionMutation = useAddCommentReaction();
  const removeReactionMutation = useRemoveCommentReaction();
  const isInIframe = useIsInIframe();

  const commentReactions = useMemo(() => {
    if (!peekId || !comments) return [];
    const comment = comments.find((c: TIssuePublicComment) => c.id === commentId);
    return comment?.comment_reactions ?? [];
  }, [peekId, comments, commentId]);

  const groupedReactions = useMemo((): Record<string, TPublicCommentReaction[]> => {
    if (!peekId) return {};
    return groupReactions(commentReactions ?? [], "reaction");
  }, [peekId, commentReactions]);

  const userReactions = commentReactions?.filter((r: TPublicCommentReaction) => r?.actor_detail?.id === user?.id);

  const handleAddReaction = (reactionHex: string) => {
    if (!anchor || !peekId) return;
    addReactionMutation.mutate({ anchor, commentId, data: { reaction: reactionHex }, issueId: peekId });
  };

  const handleRemoveReaction = (reactionHex: string) => {
    if (!anchor || !peekId) return;
    removeReactionMutation.mutate({ anchor, commentId, reactionHex, issueId: peekId });
  };

  const handleReactionClick = (reactionHex: string) => {
    const userReaction = userReactions?.find((r: TPublicCommentReaction) => r.actor_detail.id === user?.id && r.reaction === reactionHex);

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
          .map((r: TPublicCommentReaction) => r?.actor_detail?.display_name)
          .filter((name): name is string => !!name)
          .slice(0, REACTIONS_LIMIT);

        return {
          emoji: stringToEmoji(reaction),
          count: reactionList.length,
          reacted: commentReactions?.some((r: TPublicCommentReaction) => r?.actor_detail?.id === user?.id && r.reaction === reaction) || false,
          users: userNames,
        };
      });
  }, [groupedReactions, commentReactions, user?.id]);

  const handleEmojiClick = (emoji: string) => {
    if (isInIframe) return;
    if (!user) {
      router.push(`/?next_path=${pathName}?${queryParam}`);
      return;
    }
    // Convert emoji back to decimal string format for the API
    const emojiCodePoints = Array.from(emoji)
      .map((char) => char.codePointAt(0))
      .filter((cp): cp is number => cp !== undefined);
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
    <div className="mt-2">
      <EmojiReactionPicker
        isOpen={isPickerOpen}
        handleToggle={setIsPickerOpen}
        onChange={handleEmojiSelect}
        disabled={isInIframe}
        label={
          <EmojiReactionGroup
            reactions={propelReactions}
            onReactionClick={handleEmojiClick}
            showAddButton={!isInIframe}
            onAddReaction={() => setIsPickerOpen(true)}
          />
        }
        placement="bottom-start"
      />
    </div>
  );
}

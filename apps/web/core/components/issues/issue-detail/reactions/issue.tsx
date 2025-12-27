import { useMemo, useState } from "react";
import { stringToEmoji } from "@plane/propel/emoji-icon-picker";
import { EmojiReactionGroup, EmojiReactionPicker } from "@plane/propel/emoji-reaction";
import type { EmojiReactionType } from "@plane/propel/emoji-reaction";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IUser } from "@plane/types";
// ui
import { cn } from "@plane/utils";
// stores
import { useIssueReactionStore } from "@/store/issue/issue-details/reaction.store";
import { useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";

export type TIssueReaction = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  currentUser: IUser;
  disabled?: boolean;
  className?: string;
};

export function IssueReaction(props: TIssueReaction) {
  const { workspaceSlug, projectId, issueId, currentUser, disabled = false, className = "" } = props;
  // state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // store hooks - use Zustand directly
  const getReactionsByIssueId = useIssueReactionStore((s) => s.getReactionsByIssueId);
  const reactionsByUser = useIssueReactionStore((s) => s.reactionsByUser);
  const getReactionById = useIssueReactionStore((s) => s.getReactionById);
  const createReaction = useIssueReactionStore((s) => s.createReaction);
  const removeReaction = useIssueReactionStore((s) => s.removeReaction);
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug);

  const reactionIds = getReactionsByIssueId(issueId);
  const userReactions = reactionsByUser(issueId, currentUser.id).map((r) => r.reaction);

  const issueReactionOperations = useMemo(
    () => ({
      create: async (reaction: string) => {
        try {
          if (!workspaceSlug || !projectId || !issueId) throw new Error("Missing fields");
          await createReaction(workspaceSlug, projectId, issueId, reaction);
          setToast({
            title: "Success!",
            type: TOAST_TYPE.SUCCESS,
            message: "Reaction created successfully",
          });
        } catch (error) {
          setToast({
            title: "Error!",
            type: TOAST_TYPE.ERROR,
            message: "Reaction creation failed",
          });
        }
      },
      remove: async (reaction: string) => {
        try {
          if (!workspaceSlug || !projectId || !issueId || !currentUser?.id) throw new Error("Missing fields");
          await removeReaction(workspaceSlug, projectId, issueId, reaction, currentUser.id);
          setToast({
            title: "Success!",
            type: TOAST_TYPE.SUCCESS,
            message: "Reaction removed successfully",
          });
        } catch (_error) {
          setToast({
            title: "Error!",
            type: TOAST_TYPE.ERROR,
            message: "Reaction remove failed",
          });
        }
      },
      react: async (reaction: string) => {
        if (userReactions.includes(reaction)) await issueReactionOperations.remove(reaction);
        else await issueReactionOperations.create(reaction);
      },
    }),
    [workspaceSlug, projectId, issueId, currentUser, createReaction, removeReaction, userReactions]
  );

  const getReactionUsers = (reaction: string): string[] => {
    const reactionUsers = (reactionIds?.[reaction] || [])
      .map((reactionId) => {
        const reactionDetails = getReactionById(reactionId);
        if (!reactionDetails) return null;
        const member = getWorkspaceMemberByUserId(workspaceMembers, reactionDetails.actor);
        return member?.member?.display_name || reactionDetails?.display_name;
      })
      .filter((displayName): displayName is string => !!displayName);

    return reactionUsers;
  };

  // Transform reactions data to Propel EmojiReactionType format
  const reactions: EmojiReactionType[] = useMemo(() => {
    if (!reactionIds) return [];

    return Object.keys(reactionIds)
      .filter((reaction) => reactionIds[reaction]?.length > 0)
      .map((reaction) => ({
        emoji: stringToEmoji(reaction),
        count: reactionIds[reaction].length,
        reacted: userReactions.includes(reaction),
        users: getReactionUsers(reaction),
      }));
  }, [reactionIds, userReactions]);

  const handleReactionClick = (emoji: string) => {
    if (disabled) return;
    // Convert emoji back to decimal string format for the API
    const emojiCodePoints = Array.from(emoji).map((char) => char.codePointAt(0));
    const reactionString = emojiCodePoints.join("-");
    issueReactionOperations.react(reactionString);
  };

  const handleEmojiSelect = (emoji: string) => {
    // emoji is already in decimal string format from EmojiReactionPicker
    issueReactionOperations.react(emoji);
  };

  return (
    <div className={cn("relative mt-4", className)}>
      <EmojiReactionPicker
        isOpen={isPickerOpen}
        handleToggle={setIsPickerOpen}
        onChange={handleEmojiSelect}
        disabled={disabled}
        label={
          <EmojiReactionGroup
            reactions={reactions}
            onReactionClick={handleReactionClick}
            showAddButton={!disabled}
            onAddReaction={() => setIsPickerOpen(true)}
          />
        }
      />
    </div>
  );
}

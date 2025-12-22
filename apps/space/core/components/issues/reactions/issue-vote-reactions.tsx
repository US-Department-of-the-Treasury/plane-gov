import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// plane imports
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
// helpers
import { queryParamGenerator } from "@/helpers/query-param-generator";
// hooks
import useIsInIframe from "@/hooks/use-is-in-iframe";
// store
import { useCurrentUser, useIssue, useAddVote, useRemoveVote } from "@/store/queries";
import { usePeekStore } from "@/store/peek.store";

type TIssueVotes = {
  anchor: string;
  issueIdFromProps?: string;
  size?: "md" | "sm";
};

export function IssueVotes(props: TIssueVotes) {
  const { anchor, issueIdFromProps, size = "md" } = props;
  // states
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const addVoteMutation = useAddVote();
  const removeVoteMutation = useRemoveVote();

  const isInIframe = useIsInIframe();

  const issueId = issueIdFromProps ?? peekIdFromStore;
  const { data: issueDetails } = useIssue(anchor, issueId ?? "");
  const peekId = peekIdParam ?? peekIdFromStore;

  const votes = issueDetails?.vote_items ?? [];

  const allUpVotes = votes.filter((vote) => vote.vote === 1);
  const allDownVotes = votes.filter((vote) => vote.vote === -1);

  const isUpVotedByUser = allUpVotes.some((vote) => vote.actor_details?.id === user?.id);
  const isDownVotedByUser = allDownVotes.some((vote) => vote.actor_details?.id === user?.id);

  const handleVote = async (e: any, voteValue: 1 | -1) => {
    if (!issueId) return;

    setIsSubmitting(true);

    const actionPerformed = votes?.find((vote) => vote.actor_details?.id === user?.id && vote.vote === voteValue);

    if (actionPerformed) {
      await removeVoteMutation.mutateAsync({ anchor, issueId });
    } else {
      await addVoteMutation.mutateAsync({ anchor, issueId, data: { vote: voteValue } });
    }

    setIsSubmitting(false);
  };

  const VOTES_LIMIT = 1000;

  // derived values
  const { queryParam } = queryParamGenerator({ peekId, board, state, priority, labels });
  const votingDimensions = size === "sm" ? "px-1 h-6 min-w-9" : "px-2 h-7";

  return (
    <div className="flex items-center gap-2">
      {/* upvote button 👇 */}
      <Tooltip
        tooltipContent={
          <div>
            {allUpVotes.length > 0 ? (
              <>
                {allUpVotes
                  .map((r) => r.actor_details?.display_name)
                  .splice(0, VOTES_LIMIT)
                  .join(", ")}
                {allUpVotes.length > VOTES_LIMIT && " and " + (allUpVotes.length - VOTES_LIMIT) + " more"}
              </>
            ) : (
              "No upvotes yet"
            )}
          </div>
        }
      >
        <button
          type="button"
          disabled={isSubmitting}
          onClick={(e) => {
            if (isInIframe) return;
            if (user) handleVote(e, 1);
            else router.push(`/?next_path=${pathName}?${queryParam}`);
          }}
          className={cn(
            "flex items-center justify-center gap-x-1 overflow-hidden rounded-sm border focus:outline-none hover:bg-layer-transparent-hover",
            votingDimensions,
            {
              "border-accent-strong-200 text-accent-secondary": isUpVotedByUser,
              "border-strong": !isUpVotedByUser,
              "cursor-default": isInIframe,
            }
          )}
        >
          <ArrowUp className="shrink-0 size-3.5" />
          <span className="text-13 font-regular transition-opacity ease-in-out">{allUpVotes.length}</span>
        </button>
      </Tooltip>

      {/* downvote button 👇 */}
      <Tooltip
        tooltipContent={
          <div>
            {allDownVotes.length > 0 ? (
              <>
                {allDownVotes
                  .map((r) => r.actor_details.display_name)
                  .splice(0, VOTES_LIMIT)
                  .join(", ")}
                {allDownVotes.length > VOTES_LIMIT && " and " + (allDownVotes.length - VOTES_LIMIT) + " more"}
              </>
            ) : (
              "No downvotes yet"
            )}
          </div>
        }
      >
        <button
          type="button"
          disabled={isSubmitting}
          onClick={(e) => {
            if (isInIframe) return;
            if (user) handleVote(e, -1);
            else router.push(`/?next_path=${pathName}?${queryParam}`);
          }}
          className={cn(
            "flex items-center justify-center gap-x-1 overflow-hidden rounded-sm border focus:outline-none hover:bg-layer-transparent-hover",
            votingDimensions,
            {
              "border-red-600 text-red-600": isDownVotedByUser,
              "border-strong": !isDownVotedByUser,
              "cursor-default": isInIframe,
            }
          )}
        >
          <ArrowDown className="shrink-0 size-3.5" />
          <span className="text-13 font-regular transition-opacity ease-in-out">{allDownVotes.length}</span>
        </button>
      </Tooltip>
    </div>
  );
}

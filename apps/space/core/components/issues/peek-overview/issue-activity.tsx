import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import type { TIssuePublicComment } from "@plane/types";
// components
import { AddComment } from "@/components/issues/peek-overview/comment/add-comment";
import { CommentCard } from "@/components/issues/peek-overview/comment/comment-detail-card";
// hooks
import useIsInIframe from "@/hooks/use-is-in-iframe";
// store
import { usePublishSettings, useIssueComments, useCurrentUser } from "@/store/queries";
import { usePeekStore } from "@/store/peek.store";
// types
import type { IIssue } from "@/types/issue";

type Props = {
  anchor: string;
  issueDetails: IIssue;
};

export function PeekOverviewIssueActivity(props: Props) {
  const { anchor } = props;
  // router
  const pathname = usePathname();
  // store
  const { peekId } = usePeekStore();
  const { data: currentUser } = useCurrentUser();
  const { canComment } = usePublishSettings(anchor);
  const { data: comments = [] } = useIssueComments(anchor, peekId ?? "");
  // derived values
  const isInIframe = useIsInIframe();

  return (
    <div className="pb-10">
      <h4 className="font-medium">Comments</h4>
      <div className="mt-4">
        <div className="space-y-4">
          {comments.map((comment: TIssuePublicComment) => (
            <CommentCard key={comment.id} anchor={anchor} comment={comment} />
          ))}
        </div>
        {!isInIframe &&
          (currentUser ? (
            <>
              {canComment && (
                <div className="mt-4">
                  <AddComment anchor={anchor} disabled={!currentUser} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-sm border border-strong bg-layer-2 px-2 py-2.5">
              <p className="flex items-center gap-2 overflow-hidden break-words text-13 text-secondary">
                <Lock className="shrink-0 size-3" />
                Sign in to add your comment
              </p>
              <Link href={`/?next_path=${pathname}`}>
                <Button variant="primary">Sign in</Button>
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}

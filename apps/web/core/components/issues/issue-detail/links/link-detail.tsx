import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import type { TIssueLink } from "@plane/types";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import { getIconForLink, copyTextToClipboard, calculateTimeAgo } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
// types
import type { TLinkOperationsModal } from "./create-update-link-modal";

export type TIssueLinkDetail = {
  link: TIssueLink;
  linkOperations: TLinkOperationsModal;
  isNotAllowed: boolean;
};

export function IssueLinkDetail(props: TIssueLinkDetail) {
  // props
  const { link: linkDetail, linkOperations, isNotAllowed } = props;
  // router
  const { workspaceSlug } = useParams();
  // hooks - keep modal state from useIssueDetail
  const { toggleIssueLinkModal: toggleIssueLinkModalStore, setIssueLinkData } = useIssueDetail();
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug as string);
  const { isMobile } = usePlatformOS();

  const Icon = getIconForLink(linkDetail.url);

  const toggleIssueLinkModal = (modalToggle: boolean) => {
    toggleIssueLinkModalStore(modalToggle);
    setIssueLinkData(linkDetail);
  };

  const createdByDetails = getWorkspaceMemberByUserId(workspaceMembers, linkDetail.created_by_id)?.member;

  return (
    <div key={linkDetail.id}>
      <div className="relative flex flex-col rounded-md bg-surface-2 p-2.5">
        <div
          className="flex w-full cursor-pointer items-start justify-between gap-2"
          onClick={() => {
            copyTextToClipboard(linkDetail.url);
            setToast({
              type: TOAST_TYPE.SUCCESS,
              title: "Link copied!",
              message: "Link copied to clipboard",
            });
          }}
        >
          <div className="flex items-start gap-2 truncate">
            <span className="py-1">
              <Icon className="size-3 stroke-2 text-tertiary group-hover:text-primary flex-shrink-0" />
            </span>
            <Tooltip
              tooltipContent={linkDetail.title && linkDetail.title !== "" ? linkDetail.title : linkDetail.url}
              isMobile={isMobile}
            >
              <span className="truncate text-11">
                {linkDetail.title && linkDetail.title !== "" ? linkDetail.title : linkDetail.url}
              </span>
            </Tooltip>
          </div>

          {!isNotAllowed && (
            <div className="z-[1] flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex items-center justify-center p-1 hover:bg-layer-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleIssueLinkModal(true);
                }}
              >
                <Pencil className="h-3 w-3 stroke-[1.5] text-secondary" />
              </button>
              <a
                href={linkDetail.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-1 hover:bg-layer-1"
              >
                <ExternalLink className="h-3 w-3 stroke-[1.5] text-secondary" />
              </a>
              <button
                type="button"
                className="flex items-center justify-center p-1 hover:bg-layer-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  linkOperations.remove(linkDetail.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="px-5">
          <p className="mt-0.5 stroke-[1.5] text-11 text-tertiary">
            Added {calculateTimeAgo(linkDetail.created_at)}
            <br />
            {createdByDetails && (
              <>
                by {createdByDetails?.is_bot ? createdByDetails?.first_name + " Bot" : createdByDetails?.display_name}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
// store
import { useIssue } from "@/store/queries";
import { usePeekStore } from "@/store/peek.store";
// local imports
import { FullScreenPeekView } from "./full-screen-peek-view";
import { SidePeekView } from "./side-peek-view";

type TIssuePeekOverview = {
  anchor: string;
  peekId: string;
  handlePeekClose?: () => void;
};

export function IssuePeekOverview(props: TIssuePeekOverview) {
  const { anchor, peekId, handlePeekClose } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  // query params
  const board = searchParams.get("board") || undefined;
  const state = searchParams.get("state") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const labels = searchParams.get("labels") || undefined;
  // store
  const { peekMode, setPeekId } = usePeekStore();
  const { data: issueDetails } = useIssue(anchor, peekId?.toString() ?? "");
  // state
  const isSidePeekOpen = !!peekId && peekMode === "side";
  const isModalPeekOpen = !!peekId && (peekMode === "modal" || peekMode === "full");

  const handleClose = () => {
    // if close logic is passed down, call that instead of the below logic
    if (handlePeekClose) {
      handlePeekClose();
      return;
    }

    setPeekId(null);
    let queryParams: any = {
      board,
    };
    if (priority && priority.length > 0) queryParams = { ...queryParams, priority: priority };
    if (state && state.length > 0) queryParams = { ...queryParams, state: state };
    if (labels && labels.length > 0) queryParams = { ...queryParams, labels: labels };
    queryParams = new URLSearchParams(queryParams).toString();
    router.push(`/issues/${anchor}?${queryParams}`);
  };

  const handleSidePeekOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  const handleModalPeekOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <>
      {/* Side Peek Dialog */}
      <Dialog open={isSidePeekOpen} onOpenChange={handleSidePeekOpenChange}>
        <DialogPortal>
          <DialogContent
            showCloseButton={false}
            className="fixed right-0 top-0 z-20 h-full w-1/2 bg-surface-1 shadow-raised-200 border-l border-subtle-1 rounded-none translate-x-0 translate-y-0 p-0 data-[state=open]:animate-slide-in-from-right data-[state=closed]:animate-slide-out-to-right"
          >
            <SidePeekView anchor={anchor} handleClose={handleClose} issueDetails={issueDetails} />
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Modal Peek Dialog */}
      <Dialog open={isModalPeekOpen} onOpenChange={handleModalPeekOpenChange}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent
            showCloseButton={false}
            className={`fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-1 p-0 border-0 ${
              peekMode === "modal" ? "h-[70%] w-3/5" : "size-[95%]"
            }`}
          >
            {peekMode === "modal" && (
              <SidePeekView anchor={anchor} handleClose={handleClose} issueDetails={issueDetails} />
            )}
            {peekMode === "full" && (
              <FullScreenPeekView anchor={anchor} handleClose={handleClose} issueDetails={issueDetails} />
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}

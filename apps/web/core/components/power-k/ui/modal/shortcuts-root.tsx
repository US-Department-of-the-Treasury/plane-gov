import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@plane/propel/primitives";
// plane imports
import { CloseIcon } from "@plane/propel/icons";
import { Input } from "@plane/ui";
// hooks
import { usePowerK } from "@/hooks/store/use-power-k";
// local imports
import { ShortcutRenderer } from "../renderer/shortcut";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShortcutsModal(props: Props) {
  const { isOpen, onClose } = props;
  // states
  const [query, setQuery] = useState("");
  // store hooks
  const { commandRegistry } = usePowerK();

  // Get all commands from registry
  const allCommandsWithShortcuts = commandRegistry.getAllCommandsWithShortcuts();

  const handleClose = () => {
    onClose();
    setQuery("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-30 overflow-y-auto">
          <div className="my-10 flex items-center justify-center p-4 text-center sm:p-0 md:my-20">
            <DialogContent
              showCloseButton={false}
              className="relative flex h-full items-center justify-center static translate-x-0 translate-y-0 p-0 border-0 bg-transparent shadow-none"
            >
              <div className="flex h-[61vh] w-full flex-col space-y-4 overflow-hidden rounded-lg bg-surface-1 p-5 shadow-raised-200 sm:w-[28rem]">
                <DialogTitle className="flex justify-between">
                  <span className="text-16 font-medium">Keyboard shortcuts</span>
                  <button type="button" onClick={handleClose}>
                    <CloseIcon className="h-4 w-4 text-secondary hover:text-primary" aria-hidden="true" />
                  </button>
                </DialogTitle>
                <div className="flex w-full items-center rounded-sm border-[0.5px] border-subtle bg-surface-2 px-2">
                  <Search className="h-3.5 w-3.5 text-secondary" />
                  <Input
                    id="search"
                    name="search"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for shortcuts"
                    className="w-full border-none bg-transparent py-1 text-11 text-secondary outline-none"
                    autoFocus
                    tabIndex={0}
                  />
                </div>
                <ShortcutRenderer searchQuery={query} commands={allCommandsWithShortcuts} />
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

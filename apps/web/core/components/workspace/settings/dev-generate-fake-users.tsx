import { useState, useRef, useEffect, useCallback } from "react";
import { observer } from "mobx-react";
import { Wrench } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// hooks
import { useMember } from "@/hooks/store/use-member";

interface DevGenerateFakeUsersProps {
  workspaceSlug: string;
}

/**
 * Development-only component for generating fake workspace members.
 * Only renders when import.meta.env.DEV is true.
 */
export const DevGenerateFakeUsers = observer(function DevGenerateFakeUsers({ workspaceSlug }: DevGenerateFakeUsersProps) {
  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  return <DevGenerateFakeUsersContent workspaceSlug={workspaceSlug} />;
});

const DevGenerateFakeUsersContent = observer(function DevGenerateFakeUsersContent({
  workspaceSlug,
}: DevGenerateFakeUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    workspace: { generateFakeMembers },
  } = useMember();

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleGenerate = useCallback(async () => {
    if (count < 1 || count > 50) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Invalid count",
        message: "Please enter a number between 1 and 50",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateFakeMembers(workspaceSlug, count);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Success!",
        message: result.message,
      });
      setIsOpen(false);
    } catch (error: unknown) {
      let message = "Failed to generate fake users";
      if (error && typeof error === "object" && "error" in error) {
        message = (error as { error: string }).error;
      }
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [count, generateFakeMembers, workspaceSlug]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md border-2 border-dashed border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-amber-600 hover:bg-amber-500/20 transition-colors"
        title="Dev: Generate fake users (only visible in development)"
      >
        <Wrench className="h-3.5 w-3.5" />
        <span className="text-body-xs-medium">Dev</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-subtle bg-surface-1 p-4 shadow-lg"
        >
          <div className="space-y-3">
            <div>
              <h4 className="text-body-sm-medium text-primary mb-1">Generate Fake Users</h4>
              <p className="text-body-xs-regular text-secondary">
                Create test users for development. Only works in DEBUG mode.
              </p>
            </div>

            <div>
              <label htmlFor="fake-user-count" className="text-body-xs-medium text-secondary block mb-1">
                Number of users (1-50)
              </label>
              <input
                id="fake-user-count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-body-sm-regular outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="neutral-secondary"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerate}
                loading={isLoading}
                className="flex-1"
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

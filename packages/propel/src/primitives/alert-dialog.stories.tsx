import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertTriangle, Trash2, LogOut, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog";

// Component wrappers for stories that use hooks
function DestructiveActionExample() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      alert("Item deleted!");
    }, 1500);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
          <Trash2 className="h-4 w-4" />
          Delete Project
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <AlertDialogTitle className="text-center">Delete Project</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            This will permanently delete <strong>My Project</strong> and all of its data including issues, comments, and
            attachments. This action cannot be reversed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
            {isDeleting ? "Deleting..." : "Delete Project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ControlledAlertDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90"
        >
          Open Alert
        </button>
        <span className="inline-flex items-center text-sm text-secondary">State: {open ? "Open" : "Closed"}</span>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Controlled AlertDialog</AlertDialogTitle>
            <AlertDialogDescription>
              This alert dialog is controlled with external state. Notice that pressing Escape does not close it - you
              must click Cancel or Confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AsyncActionExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setOpen(false);
      alert("Action completed!");
    }, 2000);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
          Delete with Loading
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            This demonstrates an async action with loading state. Click confirm to see the loading indicator.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Deleting...
              </span>
            ) : (
              "Confirm Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const meta = {
  title: "Primitives/AlertDialog",
  component: AlertDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Radix-based AlertDialog for confirmation dialogs. Unlike Dialog, AlertDialog cannot be dismissed by clicking outside or pressing Escape - users must explicitly confirm or cancel.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render() {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
            Delete Item
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your item and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
};

export const DestructiveAction: Story = {
  name: "Destructive Action",
  render: () => <DestructiveActionExample />,
};

export const LogoutConfirmation: Story = {
  name: "Logout Confirmation",
  render() {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="inline-flex items-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your workspace. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
};

export const RemoveMember: Story = {
  name: "Remove Team Member",
  render() {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
            <UserX className="h-4 w-4" />
            Remove Member
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>John Doe</strong> will be removed from this workspace. They will lose access to all projects and
              data in this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep member</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600">Remove member</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
};

export const DiscardChanges: Story = {
  name: "Discard Changes",
  render() {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
            Close Editor
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-500 hover:bg-amber-600">Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
};

export const ControlledAlertDialog: Story = {
  name: "Controlled State",
  render: () => <ControlledAlertDialogExample />,
};

export const CustomStyling: Story = {
  name: "Custom Styling",
  render() {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="rounded-md bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-600 hover:to-pink-600">
            Premium Action
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-purple-200 bg-gradient-to-br from-surface-1 to-purple-50/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-purple-900">Upgrade to Premium</AlertDialogTitle>
            <AlertDialogDescription>
              Unlock all features with a premium subscription. Your current plan will be upgraded immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-purple-200 hover:bg-purple-50">Maybe later</AlertDialogCancel>
            <AlertDialogAction className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              Upgrade now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
};

export const WithAsyncAction: Story = {
  name: "Async Action Handler",
  render: () => <AsyncActionExample />,
};

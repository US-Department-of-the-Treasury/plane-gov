import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./dropdown-menu";

// Component wrappers for stories that use hooks
function FormDialogExample() {
  const [formData, setFormData] = useState({ name: "", email: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Submitted: ${formData.name}, ${formData.email}`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
          Create User
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Fill in the details below to create a new user account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-primary">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-sm focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-primary">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-sm focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90"
            >
              Create
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ControlledDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90"
        >
          Open Dialog
        </button>
        <span className="inline-flex items-center text-sm text-secondary">State: {open ? "Open" : "Closed"}</span>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlled Dialog</DialogTitle>
            <DialogDescription>This dialog is controlled with external state.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-secondary">
              Press Escape or click outside to close. The state is controlled externally.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Radix-based Dialog primitive following shadcn/ui patterns. Use this for modals, alerts, and overlay content.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
            Open Dialog
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>
              This is a description of the dialog content. You can add more context here.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-secondary">Dialog content goes here. This is the main body of the dialog.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
                Cancel
              </button>
            </DialogClose>
            <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

export const WithoutCloseButton: Story = {
  render() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
            Open Dialog
          </button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>No Close Button</DialogTitle>
            <DialogDescription>This dialog does not show the X close button in the corner.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

export const FormDialog: Story = {
  render: () => <FormDialogExample />,
};

export const WithDropdownInside: Story = {
  name: "With Dropdown Inside (Z-Index Test)",
  render() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
            Open Dialog
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog with Dropdown</DialogTitle>
            <DialogDescription>Test that dropdowns inside dialogs have correct z-index layering.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-secondary">
              Click the dropdown below to verify it appears above the dialog.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
                  Select Option
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L2 4h8L6 8z" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Option 1</DropdownMenuItem>
                <DropdownMenuItem>Option 2</DropdownMenuItem>
                <DropdownMenuItem>Option 3</DropdownMenuItem>
                <DropdownMenuItem>Option 4</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

export const ControlledDialog: Story = {
  render: () => <ControlledDialogExample />,
};

export const ScrollableContent: Story = {
  render() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
            Open Long Dialog
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
            <DialogDescription>Please read the following terms carefully.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <p key={i} className="text-sm text-secondary">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
                ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur.
              </p>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
                Decline
              </button>
            </DialogClose>
            <DialogClose asChild>
              <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
                Accept
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

export const CustomWidth: Story = {
  render() {
    return (
      <div className="flex gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <button className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
              Small (sm)
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Small Dialog</DialogTitle>
            </DialogHeader>
            <p className="py-4 text-sm text-secondary">This is a small width dialog.</p>
            <DialogFooter>
              <DialogClose asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color">
                  Close
                </button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <button className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
              Medium (md)
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Medium Dialog</DialogTitle>
            </DialogHeader>
            <p className="py-4 text-sm text-secondary">This is a medium width dialog.</p>
            <DialogFooter>
              <DialogClose asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color">
                  Close
                </button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <button className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
              Large (2xl)
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Large Dialog</DialogTitle>
            </DialogHeader>
            <p className="py-4 text-sm text-secondary">This is a large width dialog.</p>
            <DialogFooter>
              <DialogClose asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color">
                  Close
                </button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};

export const FocusManagement: Story = {
  name: "Focus Management Test",
  render() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
            Test Focus Trapping
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Focus Management</DialogTitle>
            <DialogDescription>
              Test focus trapping by pressing Tab. Focus should cycle through the interactive elements without escaping
              the dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <input
              type="text"
              placeholder="First input"
              className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-sm focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <input
              type="text"
              placeholder="Second input"
              className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-sm focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <select className="w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-sm focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-layer-2">
                Cancel
              </button>
            </DialogClose>
            <button className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-on-color hover:bg-accent-primary/90">
              Submit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { Switch } from "./switch";

const meta: Meta<typeof Label> = {
  title: "Primitives/Label",
  component: Label,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => <Label>Email address</Label>,
};

export const WithInput: Story = {
  render: () => (
    <div className="grid w-[300px] gap-1.5">
      <Label htmlFor="email">Email</Label>
      <input
        type="email"
        id="email"
        placeholder="m@example.com"
        className="flex h-10 w-full rounded-md border border-subtle bg-layer-2 px-3 py-2 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
    </div>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const WithSwitch: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">Airplane Mode</Label>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="grid w-[300px] gap-1.5">
      <Label htmlFor="name">
        Full Name <span className="text-red-500">*</span>
      </Label>
      <input
        type="text"
        id="name"
        required
        placeholder="John Doe"
        className="flex h-10 w-full rounded-md border border-subtle bg-layer-2 px-3 py-2 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="grid w-[300px] gap-1.5">
      <Label htmlFor="password">Password</Label>
      <input
        type="password"
        id="password"
        placeholder="Enter your password"
        className="flex h-10 w-full rounded-md border border-subtle bg-layer-2 px-3 py-2 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
      />
      <p className="text-11 text-tertiary">Must be at least 8 characters</p>
    </div>
  ),
};

export const DisabledState: Story = {
  render: () => (
    <div className="grid w-[300px] gap-1.5">
      <Label htmlFor="disabled-input" className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Disabled Field
      </Label>
      <input
        type="text"
        id="disabled-input"
        disabled
        placeholder="Cannot edit"
        className="peer flex h-10 w-full rounded-md border border-subtle bg-layer-2 px-3 py-2 text-sm placeholder:text-tertiary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  ),
};

export const FormExample: Story = {
  name: "Complete Form",
  render: () => (
    <form className="space-y-4 w-[350px]">
      <div className="grid gap-1.5">
        <Label htmlFor="form-name">
          Name <span className="text-red-500">*</span>
        </Label>
        <input
          type="text"
          id="form-name"
          placeholder="Enter your name"
          className="flex h-10 w-full rounded-md border border-subtle bg-layer-2 px-3 py-2 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="form-email">
          Email <span className="text-red-500">*</span>
        </Label>
        <input
          type="email"
          id="form-email"
          placeholder="m@example.com"
          className="flex h-10 w-full rounded-md border border-subtle bg-layer-2 px-3 py-2 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="form-message">Message</Label>
        <textarea
          id="form-message"
          placeholder="Your message"
          rows={4}
          className="flex min-h-[80px] w-full rounded-md border border-subtle bg-layer-2 px-3 py-2 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-y"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="form-terms" />
        <Label htmlFor="form-terms">I agree to the terms and conditions</Label>
      </div>
    </form>
  ),
};

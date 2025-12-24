import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta: Meta<typeof Checkbox> = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="default" />
      <Label htmlFor="default">Accept terms and conditions</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="checked" defaultChecked />
      <Label htmlFor="checked">This checkbox is checked</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-unchecked" disabled />
        <Label htmlFor="disabled-unchecked" className="opacity-50">
          Disabled unchecked
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked" className="opacity-50">
          Disabled checked
        </Label>
      </div>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="items-top flex space-x-2">
      <Checkbox id="terms1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="terms1">Accept terms and conditions</Label>
        <p className="text-sm text-tertiary">You agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  ),
};

const ControlledExample = () => {
  const [checked, setChecked] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="controlled" checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
        <Label htmlFor="controlled">Controlled checkbox (checked: {String(checked)})</Label>
      </div>
      <button onClick={() => setChecked(!checked)} className="text-sm text-accent-primary hover:underline">
        Toggle from outside
      </button>
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledExample />,
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <h3 className="text-13 font-medium">Checkbox States</h3>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="state-unchecked" />
          <Label htmlFor="state-unchecked">Unchecked</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="state-checked" defaultChecked />
          <Label htmlFor="state-checked">Checked</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="state-disabled" disabled />
          <Label htmlFor="state-disabled" className="opacity-50">
            Disabled
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="state-disabled-checked" disabled defaultChecked />
          <Label htmlFor="state-disabled-checked" className="opacity-50">
            Disabled Checked
          </Label>
        </div>
      </div>
    </div>
  ),
};

export const FormExample: Story = {
  name: "Form Integration",
  render: () => (
    <form className="space-y-4 w-[350px]">
      <h3 className="text-13 font-medium">Newsletter Preferences</h3>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="marketing" />
          <Label htmlFor="marketing">Marketing emails</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="product" defaultChecked />
          <Label htmlFor="product">Product updates</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="security" defaultChecked />
          <Label htmlFor="security">Security alerts</Label>
        </div>
      </div>
    </form>
  ),
};

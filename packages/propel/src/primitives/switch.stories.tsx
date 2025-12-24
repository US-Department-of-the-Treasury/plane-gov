import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./switch";
import { Label } from "./label";

const meta: Meta<typeof Switch> = {
  title: "Primitives/Switch",
  component: Switch,
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
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="default" />
      <Label htmlFor="default">Airplane Mode</Label>
    </div>
  ),
};

export const Checked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="checked" defaultChecked />
      <Label htmlFor="checked">Notifications enabled</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch id="disabled-off" disabled />
        <Label htmlFor="disabled-off" className="opacity-50">
          Disabled (off)
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-on" disabled defaultChecked />
        <Label htmlFor="disabled-on" className="opacity-50">
          Disabled (on)
        </Label>
      </div>
    </div>
  ),
};

const ControlledExample = () => {
  const [checked, setChecked] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch id="controlled" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="controlled">Dark mode: {checked ? "On" : "Off"}</Label>
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

export const WithDescription: Story = {
  render: () => (
    <div className="flex items-center justify-between space-x-4 w-[350px]">
      <div className="space-y-0.5">
        <Label htmlFor="notifications">Push Notifications</Label>
        <p className="text-sm text-tertiary">Receive notifications about new activity</p>
      </div>
      <Switch id="notifications" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <h3 className="text-13 font-medium">Switch States</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch id="state-off" />
          <Label htmlFor="state-off">Off</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="state-on" defaultChecked />
          <Label htmlFor="state-on">On</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="state-disabled-off" disabled />
          <Label htmlFor="state-disabled-off" className="opacity-50">
            Disabled Off
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="state-disabled-on" disabled defaultChecked />
          <Label htmlFor="state-disabled-on" className="opacity-50">
            Disabled On
          </Label>
        </div>
      </div>
    </div>
  ),
};

export const SettingsExample: Story = {
  name: "Settings Panel",
  render: () => (
    <div className="space-y-6 w-[400px] border border-subtle rounded-lg p-4">
      <h3 className="text-13 font-medium">Notification Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notif">Email notifications</Label>
            <p className="text-11 text-tertiary">Receive updates via email</p>
          </div>
          <Switch id="email-notif" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notif">Push notifications</Label>
            <p className="text-11 text-tertiary">Receive push alerts</p>
          </div>
          <Switch id="push-notif" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sms-notif">SMS notifications</Label>
            <p className="text-11 text-tertiary">Receive text messages</p>
          </div>
          <Switch id="sms-notif" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="marketing" className="opacity-50">
              Marketing emails
            </Label>
            <p className="text-11 text-tertiary opacity-50">Promotional content (disabled by admin)</p>
          </div>
          <Switch id="marketing" disabled />
        </div>
      </div>
    </div>
  ),
};

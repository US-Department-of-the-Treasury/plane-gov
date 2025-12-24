import type { Meta, StoryObj } from "@storybook/react-vite";
import { Loader } from "./loader";

const meta = {
  title: "Components/Loader",
  component: Loader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["inline", "centered", "fullscreen", "overlay"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
  },
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithText: Story = {
  args: {
    text: "Loading data...",
  },
};

export const Inline: Story = {
  args: {
    variant: "inline",
    text: "Loading...",
  },
};

export const InlineSmall: Story = {
  args: {
    variant: "inline",
    size: "sm",
    text: "Loading...",
  },
};

export const CenteredLarge: Story = {
  args: {
    variant: "centered",
    size: "lg",
    text: "Loading your content...",
  },
};

export const AllVariants: Story = {
  render() {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-16 font-semibold">Inline</h3>
          <div className="flex items-center gap-4">
            <Loader variant="inline" size="sm" text="Small" />
            <Loader variant="inline" size="default" text="Default" />
            <Loader variant="inline" size="lg" text="Large" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-16 font-semibold">Centered</h3>
          <div className="flex items-start gap-8">
            <Loader variant="centered" size="sm" text="Small" />
            <Loader variant="centered" size="default" text="Default" />
            <Loader variant="centered" size="lg" text="Large" />
          </div>
        </div>
      </div>
    );
  },
};

export const InButton: Story = {
  render() {
    return (
      <div className="flex gap-4">
        <button className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white" disabled>
          <Loader variant="inline" size="sm" />
          <span>Saving</span>
        </button>
        <button className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white" disabled>
          <Loader variant="inline" size="sm" text="Processing..." />
        </button>
      </div>
    );
  },
};

export const InCard: Story = {
  render() {
    return (
      <div className="w-96 rounded-lg border border-gray-200 bg-white p-8 shadow-md">
        <Loader variant="centered" text="Loading content..." />
      </div>
    );
  },
};

export const Overlay: Story = {
  render() {
    return (
      <div className="relative h-64 w-96 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-lg font-semibold">Card Content</h3>
        <p className="mt-2 text-gray-600">This content is being updated...</p>
        <p className="mt-2 text-gray-600">More content here that will be covered by the overlay.</p>
        <Loader variant="overlay" text="Updating..." />
      </div>
    );
  },
};

export const ConditionalLoading: Story = {
  render() {
    return (
      <div className="relative h-64 w-96 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-lg font-semibold">Conditional Loading</h3>
        <p className="mt-2 text-gray-600">The loader only renders when loading=true</p>
        <div className="mt-4 flex gap-4">
          <div className="flex-1 rounded border p-2">
            <p className="text-xs text-gray-500">loading=true</p>
            <Loader loading={true} variant="inline" size="sm" />
          </div>
          <div className="flex-1 rounded border p-2">
            <p className="text-xs text-gray-500">loading=false</p>
            <Loader loading={false} variant="inline" size="sm" />
            <span className="text-sm text-green-600">Content ready!</span>
          </div>
        </div>
      </div>
    );
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./circular-spinner";

const meta = {
  title: "Components/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "default", "lg", "xl"],
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExtraSmall: Story = {
  args: {
    size: "xs",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
  },
};

export const ExtraLarge: Story = {
  args: {
    size: "xl",
  },
};

export const CustomColor: Story = {
  args: {
    className: "text-blue-500",
  },
};

export const AllSizes: Story = {
  render() {
    return (
      <div className="flex items-center gap-6">
        <div className="text-center">
          <Spinner size="xs" />
          <p className="mt-2 text-11 text-gray-600">XS</p>
        </div>
        <div className="text-center">
          <Spinner size="sm" />
          <p className="mt-2 text-11 text-gray-600">SM</p>
        </div>
        <div className="text-center">
          <Spinner size="default" />
          <p className="mt-2 text-11 text-gray-600">Default</p>
        </div>
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-2 text-11 text-gray-600">LG</p>
        </div>
        <div className="text-center">
          <Spinner size="xl" />
          <p className="mt-2 text-11 text-gray-600">XL</p>
        </div>
      </div>
    );
  },
};

export const ColorVariations: Story = {
  render() {
    return (
      <div className="flex items-center gap-6">
        <div className="text-center">
          <Spinner className="text-blue-500" />
          <p className="mt-2 text-11 text-gray-600">Blue</p>
        </div>
        <div className="text-center">
          <Spinner className="text-green-500" />
          <p className="mt-2 text-11 text-gray-600">Green</p>
        </div>
        <div className="text-center">
          <Spinner className="text-red-500" />
          <p className="mt-2 text-11 text-gray-600">Red</p>
        </div>
        <div className="text-center">
          <Spinner className="text-purple-500" />
          <p className="mt-2 text-11 text-gray-600">Purple</p>
        </div>
        <div className="text-center">
          <Spinner className="text-orange-500" />
          <p className="mt-2 text-11 text-gray-600">Orange</p>
        </div>
      </div>
    );
  },
};

export const InButton: Story = {
  render() {
    return (
      <button className="flex items-center gap-2 rounded-sm bg-blue-500 px-4 py-2 text-on-color">
        <Spinner size="sm" />
        <span>Loading...</span>
      </button>
    );
  },
};

export const CenteredInCard: Story = {
  render() {
    return (
      <div className="w-96 rounded-lg border border-gray-200 bg-white p-8 shadow-md">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <p className="text-13 text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  },
};

// Legacy API examples (deprecated but still supported)
export const LegacyAPI: Story = {
  name: "Legacy API (deprecated)",
  render() {
    return (
      <div className="flex items-center gap-6">
        <div className="text-center">
          <Spinner height="16px" width="16px" />
          <p className="mt-2 text-11 text-gray-600">16px</p>
        </div>
        <div className="text-center">
          <Spinner height="24px" width="24px" />
          <p className="mt-2 text-11 text-gray-600">24px</p>
        </div>
        <div className="text-center">
          <Spinner height="32px" width="32px" />
          <p className="mt-2 text-11 text-gray-600">32px</p>
        </div>
      </div>
    );
  },
};

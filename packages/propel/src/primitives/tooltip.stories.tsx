import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render() {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Hover me</button>
        </TooltipTrigger>
        <TooltipContent>This is a tooltip</TooltipContent>
      </Tooltip>
    );
  },
};

export const WithIcon: Story = {
  render() {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="rounded-full p-2 hover:bg-layer-2">
            <Info className="h-5 w-5 text-secondary" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Additional information</TooltipContent>
      </Tooltip>
    );
  },
};

export const Positions: Story = {
  render() {
    return (
      <div className="flex flex-col items-center gap-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Top (default)</button>
          </TooltipTrigger>
          <TooltipContent side="top">Tooltip on top</TooltipContent>
        </Tooltip>
        <div className="flex gap-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Left</button>
            </TooltipTrigger>
            <TooltipContent side="left">Tooltip on left</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Right</button>
            </TooltipTrigger>
            <TooltipContent side="right">Tooltip on right</TooltipContent>
          </Tooltip>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Bottom</button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Tooltip on bottom</TooltipContent>
        </Tooltip>
      </div>
    );
  },
};

/**
 * Radix Tooltip automatically handles viewport edge collision detection.
 * When a tooltip would overflow the viewport, it automatically repositions
 * to the opposite side or adjusts alignment.
 *
 * Scroll the container to position buttons at viewport edges to test.
 */
export const ViewportEdgePositioning: Story = {
  parameters: {
    layout: "fullscreen",
  },
  render() {
    return (
      <div className="h-screen w-screen overflow-auto p-4">
        <div className="relative h-[200vh] w-[200vw]">
          {/* Top-left corner */}
          <div className="absolute left-4 top-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Top-Left Edge</button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Auto-repositioned from viewport edge</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Top-right corner */}
          <div className="absolute right-4 top-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Top-Right Edge</button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Auto-repositioned from viewport edge</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Center</button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Normal positioning in center</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Bottom-left corner */}
          <div className="absolute bottom-4 left-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Bottom-Left Edge</button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Auto-repositioned from viewport edge</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Bottom-right corner */}
          <div className="absolute bottom-4 right-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Bottom-Right Edge</button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Auto-repositioned from viewport edge</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  },
};

export const WithCustomOffset: Story = {
  render() {
    return (
      <div className="flex gap-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Default (4px)</button>
          </TooltipTrigger>
          <TooltipContent>Default offset</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Large (12px)</button>
          </TooltipTrigger>
          <TooltipContent sideOffset={12}>Large offset</TooltipContent>
        </Tooltip>
      </div>
    );
  },
};

export const LongContent: Story = {
  render() {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="rounded-md bg-accent-primary px-4 py-2 text-on-color">Hover for details</button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>
            This is a longer tooltip with more detailed information that demonstrates how the tooltip handles multi-line
            content gracefully.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  },
};

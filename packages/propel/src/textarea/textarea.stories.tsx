import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./index";

const meta: Meta<typeof Textarea> = {
  title: "Components/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "select",
      options: ["primary", "transparent", "true-transparent"],
    },
    hasError: {
      control: "boolean",
    },
    hasSuccess: {
      control: "boolean",
    },
    showCharacterCount: {
      control: "boolean",
    },
    maxLength: {
      control: "number",
    },
    disabled: {
      control: "boolean",
    },
    rows: {
      control: "number",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

const createStory = (args: Partial<React.ComponentProps<typeof Textarea>>): Story => ({
  args: { placeholder: "Enter text...", className: "w-[400px]", ...args },
});

const createShowcaseStory = (
  title: string,
  sections: Array<{ label: string; props: Partial<React.ComponentProps<typeof Textarea>> }>
): Story => ({
  render: () => (
    <div className="space-y-4 w-[400px]">
      <div className="space-y-2">
        <h3 className="text-13 font-medium">{title}</h3>
        <div className="space-y-4">
          {sections.map(({ label, props }, index) => (
            <div key={index} className="w-full">
              <label className="text-11 text-gray-500 mb-1 block">{label}</label>
              <Textarea className="w-full" {...props} />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
});

export const Default = createStory({});

export const Primary = createStory({
  mode: "primary",
  placeholder: "Primary textarea",
});

export const Transparent = createStory({
  mode: "transparent",
  placeholder: "Transparent textarea",
});

export const TrueTransparent = createStory({
  mode: "true-transparent",
  placeholder: "True transparent textarea",
});

export const WithCharacterCount = createStory({
  showCharacterCount: true,
  maxLength: 280,
  placeholder: "Enter your bio (max 280 characters)",
});

export const WithCharacterCountNoLimit = createStory({
  showCharacterCount: true,
  placeholder: "Character count without limit",
  defaultValue: "This text shows character count without a maximum limit",
});

export const WithError = createStory({
  hasError: true,
  placeholder: "Textarea with error",
  defaultValue: "Invalid input",
});

export const WithSuccess = createStory({
  hasSuccess: true,
  placeholder: "Textarea with success",
  defaultValue: "Valid input",
});

export const Disabled = createStory({
  disabled: true,
  placeholder: "Disabled textarea",
  defaultValue: "Cannot edit this",
});

export const WithValue = createStory({
  defaultValue: "Pre-filled value that spans multiple lines.\n\nThis is a second paragraph.",
  placeholder: "Textarea with value",
});

export const CustomRows = createStory({
  rows: 6,
  placeholder: "Textarea with 6 rows",
});

export const AllModes = createShowcaseStory("Textarea Modes", [
  { label: "Primary", props: { mode: "primary", placeholder: "Primary textarea" } },
  { label: "Transparent", props: { mode: "transparent", placeholder: "Transparent textarea" } },
  { label: "True Transparent", props: { mode: "true-transparent", placeholder: "True transparent textarea" } },
]);

export const AllStates = createShowcaseStory("Textarea States", [
  { label: "Normal", props: { placeholder: "Normal textarea" } },
  { label: "With Error", props: { hasError: true, placeholder: "Textarea with error" } },
  { label: "With Success", props: { hasSuccess: true, placeholder: "Textarea with success" } },
  { label: "Disabled", props: { disabled: true, placeholder: "Disabled textarea" } },
  { label: "With Character Count", props: { showCharacterCount: true, maxLength: 100, placeholder: "Max 100 chars" } },
]);

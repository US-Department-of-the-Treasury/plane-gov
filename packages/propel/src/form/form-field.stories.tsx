import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField } from "./form-field";
import { Input } from "../input";
import { Textarea } from "../textarea";
import { Checkbox } from "../primitives/checkbox";
import { Label } from "../primitives/label";

const meta: Meta<typeof FormField> = {
  title: "Components/FormField",
  component: FormField,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  render: () => (
    <div className="w-[350px]">
      <FormField id="email" label="Email">
        <Input id="email" type="email" placeholder="m@example.com" />
      </FormField>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="w-[350px]">
      <FormField id="name" label="Full Name" required>
        <Input id="name" placeholder="John Doe" />
      </FormField>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="w-[350px]">
      <FormField
        id="password"
        label="Password"
        required
        description="Must be at least 8 characters with one uppercase letter"
      >
        <Input id="password" type="password" placeholder="Enter your password" />
      </FormField>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-[350px]">
      <FormField id="email-error" label="Email" required error="Please enter a valid email address">
        <Input id="email-error" type="email" placeholder="m@example.com" defaultValue="invalid-email" hasError />
      </FormField>
    </div>
  ),
};

export const WithSuccess: Story = {
  render: () => (
    <div className="w-[350px]">
      <FormField id="username" label="Username" required success="Username is available">
        <Input id="username" placeholder="johndoe" defaultValue="johndoe123" hasSuccess />
      </FormField>
    </div>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <div className="w-[350px]">
      <FormField id="bio" label="Bio" description="Tell us about yourself">
        <Textarea id="bio" placeholder="A brief description about yourself" maxLength={280} showCharacterCount />
      </FormField>
    </div>
  ),
};

export const TextareaWithError: Story = {
  render: () => (
    <div className="w-[350px]">
      <FormField id="description" label="Description" required error="Description is required">
        <Textarea id="description" placeholder="Enter description" hasError />
      </FormField>
    </div>
  ),
};

const FormValidationExample = () => {
  const [email, setEmail] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showError = touched && !isValid && email.length > 0;
  const showSuccess = touched && isValid;

  return (
    <div className="w-[350px]">
      <FormField
        id="validated-email"
        label="Email"
        required
        error={showError ? "Please enter a valid email address" : undefined}
        success={showSuccess ? "Email looks good!" : undefined}
      >
        <Input
          id="validated-email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          hasError={showError}
          hasSuccess={showSuccess}
        />
      </FormField>
    </div>
  );
};

export const LiveValidation: Story = {
  render: () => <FormValidationExample />,
};

export const CompleteForm: Story = {
  name: "Complete Form Example",
  render: () => (
    <form className="space-y-4 w-[400px]">
      <h3 className="text-lg font-medium">Create Account</h3>

      <FormField id="form-name" label="Full Name" required>
        <Input id="form-name" placeholder="John Doe" />
      </FormField>

      <FormField id="form-email" label="Email" required description="We'll never share your email">
        <Input id="form-email" type="email" placeholder="m@example.com" />
      </FormField>

      <FormField id="form-password" label="Password" required description="At least 8 characters">
        <Input id="form-password" type="password" placeholder="Create a password" />
      </FormField>

      <FormField id="form-bio" label="Bio" description="Optional: Tell us about yourself">
        <Textarea id="form-bio" placeholder="A few words about you" maxLength={280} showCharacterCount />
      </FormField>

      <div className="flex items-center space-x-2">
        <Checkbox id="form-terms" />
        <Label htmlFor="form-terms" className="text-sm">
          I agree to the terms and conditions
        </Label>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90"
      >
        Create Account
      </button>
    </form>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6 w-[350px]">
      <h3 className="text-13 font-medium">FormField States</h3>

      <FormField id="state-default" label="Default State">
        <Input id="state-default" placeholder="Default input" />
      </FormField>

      <FormField id="state-required" label="Required Field" required>
        <Input id="state-required" placeholder="Required input" />
      </FormField>

      <FormField id="state-description" label="With Description" description="This is helper text">
        <Input id="state-description" placeholder="Input with description" />
      </FormField>

      <FormField id="state-error" label="Error State" error="This field has an error">
        <Input id="state-error" placeholder="Error input" hasError />
      </FormField>

      <FormField id="state-success" label="Success State" success="This field is valid">
        <Input id="state-success" placeholder="Success input" hasSuccess />
      </FormField>
    </div>
  ),
};

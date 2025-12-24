"use client";

import * as React from "react";
import { Label } from "../primitives/label";
import { cn } from "../utils";

export interface FormFieldProps {
  /**
   * The unique identifier for the form field
   */
  id?: string;
  /**
   * Label text for the field
   */
  label?: string;
  /**
   * Whether the field is required
   * @default false
   */
  required?: boolean;
  /**
   * Helper/description text shown below the input
   */
  description?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Success message to display (only shown when no error)
   */
  success?: string;
  /**
   * The form control (input, textarea, select, etc.)
   */
  children: React.ReactNode;
  /**
   * Additional class name for the wrapper
   */
  className?: string;
}

/**
 * FormField wrapper component for consistent form field layout.
 * Handles label, description, error/success messages, and proper accessibility.
 *
 * @example
 * ```tsx
 * // Basic usage with Input
 * <FormField
 *   id="email"
 *   label="Email"
 *   required
 *   error={errors.email?.message}
 * >
 *   <Input id="email" hasError={!!errors.email} />
 * </FormField>
 *
 * // With react-hook-form Controller
 * <Controller
 *   control={control}
 *   name="name"
 *   render={({ field, fieldState }) => (
 *     <FormField
 *       id="name"
 *       label="Full Name"
 *       required
 *       error={fieldState.error?.message}
 *     >
 *       <Input
 *         {...field}
 *         id="name"
 *         hasError={!!fieldState.error}
 *       />
 *     </FormField>
 *   )}
 * />
 *
 * // With description
 * <FormField
 *   id="bio"
 *   label="Bio"
 *   description="Tell us about yourself"
 * >
 *   <Textarea id="bio" maxLength={280} showCharacterCount />
 * </FormField>
 * ```
 */
function FormField({ id, label, required = false, description, error, success, children, className }: FormFieldProps) {
  const errorId = id ? `${id}-error` : undefined;
  const descriptionId = id ? `${id}-description` : undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-13">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p id={descriptionId} className="text-11 text-tertiary">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-11 text-error-text" role="alert">
          {error}
        </p>
      )}
      {!error && success && <p className="text-11 text-success-text">{success}</p>}
    </div>
  );
}

FormField.displayName = "FormField";

export { FormField };

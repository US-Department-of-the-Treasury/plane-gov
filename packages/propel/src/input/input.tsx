"use client";

import * as React from "react";
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Visual style variant of the input
   * @default "primary"
   */
  mode?: "primary" | "transparent" | "true-transparent";
  /**
   * Size variant of the input
   * @default "sm"
   */
  inputSize?: "xs" | "sm" | "md";
  /**
   * Whether the input has an error state
   * @default false
   */
  hasError?: boolean;
  /**
   * Whether the input has a success state
   * @default false
   */
  hasSuccess?: boolean;
}

/**
 * Input component for text entry.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Input placeholder="Enter your name" />
 *
 * // With error state
 * <Input hasError placeholder="Invalid input" />
 *
 * // With success state
 * <Input hasSuccess placeholder="Valid input" />
 *
 * // With react-hook-form
 * <Controller
 *   control={control}
 *   name="email"
 *   render={({ field, fieldState }) => (
 *     <Input {...field} hasError={!!fieldState.error} />
 *   )}
 * />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      type,
      name,
      mode = "primary",
      inputSize = "sm",
      hasError = false,
      hasSuccess = false,
      className = "",
      autoComplete = "off",
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <input
        id={id}
        ref={ref}
        type={type}
        name={name}
        disabled={disabled}
        className={cn(
          // Base styles
          "flex w-full text-13 text-primary placeholder:text-tertiary",
          "transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Mode variants
          {
            // Primary mode - bordered with background
            "rounded-md border border-subtle bg-layer-2": mode === "primary",
            // Transparent mode - no border until focus
            "rounded-sm border-none bg-transparent ring-0 transition-all focus:ring-1 focus:ring-accent-strong":
              mode === "transparent",
            // True transparent mode - completely borderless
            "rounded-sm border-none bg-transparent ring-0": mode === "true-transparent",
          },
          // Focus ring for primary mode
          mode === "primary" &&
            "focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1",
          // Size variants
          {
            "px-1.5 py-1 text-xs": inputSize === "xs",
            "px-3 py-2": inputSize === "sm",
            "p-3": inputSize === "md",
          },
          // State variants - error takes precedence over success
          hasError && "border-error-border focus-visible:ring-error-border",
          !hasError && hasSuccess && "border-success-border focus-visible:ring-success-border",
          className
        )}
        aria-invalid={hasError || undefined}
        autoComplete={autoComplete}
        {...rest}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };

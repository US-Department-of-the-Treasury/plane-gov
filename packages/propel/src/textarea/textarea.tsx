"use client";

import * as React from "react";
import { cn } from "../utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Visual style variant of the textarea
   * @default "primary"
   */
  mode?: "primary" | "transparent" | "true-transparent";
  /**
   * Whether the textarea has an error state
   * @default false
   */
  hasError?: boolean;
  /**
   * Whether the textarea has a success state
   * @default false
   */
  hasSuccess?: boolean;
  /**
   * Maximum character count (shows counter when provided)
   */
  maxLength?: number;
  /**
   * Show character count (requires maxLength or value to be meaningful)
   * @default false
   */
  showCharacterCount?: boolean;
}

/**
 * Textarea component for multi-line text entry.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Textarea placeholder="Enter description" />
 *
 * // With character count
 * <Textarea
 *   placeholder="Enter bio"
 *   maxLength={280}
 *   showCharacterCount
 * />
 *
 * // With error state
 * <Textarea hasError placeholder="Invalid input" />
 *
 * // With react-hook-form
 * <Controller
 *   control={control}
 *   name="description"
 *   render={({ field, fieldState }) => (
 *     <Textarea {...field} hasError={!!fieldState.error} />
 *   )}
 * />
 * ```
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      mode = "primary",
      hasError = false,
      hasSuccess = false,
      maxLength,
      showCharacterCount = false,
      className = "",
      disabled,
      value,
      defaultValue,
      onChange,
      ...rest
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<string>((defaultValue as string) || "");

    // Use controlled value if provided, otherwise use internal state
    const currentValue = value !== undefined ? String(value) : internalValue;
    const characterCount = currentValue.length;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (value === undefined) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const isOverLimit = maxLength !== undefined && characterCount > maxLength;

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          disabled={disabled}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onChange={handleChange}
          maxLength={maxLength}
          className={cn(
            // Base styles
            "flex min-h-[80px] w-full text-13 text-primary placeholder:text-tertiary",
            "transition-colors resize-y",
            "focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Mode variants
            {
              // Primary mode - bordered with background
              "rounded-md border border-subtle bg-layer-2 px-3 py-2": mode === "primary",
              // Transparent mode - no border until focus
              "rounded-sm border-none bg-transparent ring-0 transition-all px-3 py-2 focus:ring-1 focus:ring-accent-strong":
                mode === "transparent",
              // True transparent mode - completely borderless
              "rounded-sm border-none bg-transparent ring-0 px-3 py-2": mode === "true-transparent",
            },
            // Focus ring for primary mode
            mode === "primary" &&
              "focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1",
            // State variants - error takes precedence over success
            hasError && "border-error-border focus-visible:ring-error-border",
            !hasError && hasSuccess && "border-success-border focus-visible:ring-success-border",
            // Add padding at bottom for character count
            showCharacterCount && "pb-6",
            className
          )}
          aria-invalid={hasError || undefined}
          {...rest}
        />
        {showCharacterCount && (
          <div className={cn("absolute bottom-2 right-3 text-11", isOverLimit ? "text-error-text" : "text-tertiary")}>
            {characterCount}
            {maxLength !== undefined && `/${maxLength}`}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };

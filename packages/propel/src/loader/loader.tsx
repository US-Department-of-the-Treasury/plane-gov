"use client";

import * as React from "react";
import { cn } from "../utils";
import { Spinner } from "../spinners";
import { loaderVariants, spinnerSizeMap  } from "./helper";
import type {LoaderProps} from "./helper";

/**
 * Loader component for displaying loading states.
 *
 * @example
 * // Inline loader in a button
 * <Button disabled>
 *   <Loader variant="inline" text="Saving..." />
 * </Button>
 *
 * @example
 * // Centered loader in a content area
 * <Loader text="Loading data..." />
 *
 * @example
 * // Full-screen loading overlay
 * <Loader variant="fullscreen" text="Please wait..." />
 *
 * @example
 * // Overlay on a container (container needs position: relative)
 * <div className="relative">
 *   <Content />
 *   {isLoading && <Loader variant="overlay" />}
 * </div>
 */
export const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(function Loader(
  { variant = "centered", size = "default", text, spinner, loading = true, className, children, ...props },
  ref
) {
  if (!loading) return null;

  const spinnerSize = spinnerSizeMap[variant ?? "centered"][size ?? "default"];

  return (
    <div ref={ref} className={cn(loaderVariants({ variant, size }), className)} role="status" {...props}>
      {spinner ?? <Spinner size={spinnerSize} />}
      {text && <span className="text-secondary">{text}</span>}
      {children}
      <span className="sr-only">{text || "Loading..."}</span>
    </div>
  );
});

Loader.displayName = "Loader";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../utils";
import type { ButtonProps } from "./helper";
import { getIconStyling, buttonVariants } from "./helper";

const Button = React.forwardRef(function Button(props: ButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) {
  const {
    variant = "primary",
    size = "base",
    className = "",
    type = "button",
    loading = false,
    disabled = false,
    prependIcon = null,
    appendIcon = null,
    children,
    ...rest
  } = props;

  const buttonIconStyle = getIconStyling(size ?? "base");

  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 className={cn("shrink-0 animate-spin", buttonIconStyle)} strokeWidth={2} />
      ) : (
        prependIcon && React.cloneElement(prependIcon, { className: cn("shrink-0", buttonIconStyle), strokeWidth: 2 })
      )}
      {children}
      {appendIcon &&
        !loading &&
        React.cloneElement(appendIcon, { className: cn("shrink-0", buttonIconStyle), strokeWidth: 2 })}
    </button>
  );
});

Button.displayName = "plane-ui-button";

export { Button };

import React, { useState, useEffect, useCallback } from "react";
import {
  Collapsible as RadixCollapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@plane/propel/primitives";

export type TCollapsibleProps = {
  title: string | React.ReactNode;
  children: React.ReactNode;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  buttonClassName?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
};

export function Collapsible(props: TCollapsibleProps) {
  const { title, children, buttonRef, className, buttonClassName, isOpen, onToggle, defaultOpen } = props;
  // state
  const [localIsOpen, setLocalIsOpen] = useState<boolean>(isOpen || defaultOpen ? true : false);

  useEffect(() => {
    if (isOpen !== undefined) {
      setLocalIsOpen(isOpen);
    }
  }, [isOpen]);

  // handlers
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (isOpen !== undefined) {
        // Controlled mode - call onToggle
        if (onToggle) onToggle();
      } else {
        // Uncontrolled mode - update local state
        setLocalIsOpen(open);
      }
    },
    [isOpen, onToggle]
  );

  return (
    <RadixCollapsible open={localIsOpen} onOpenChange={handleOpenChange} className={className}>
      <CollapsibleTrigger ref={buttonRef} className={buttonClassName}>
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        {children}
      </CollapsibleContent>
    </RadixCollapsible>
  );
}

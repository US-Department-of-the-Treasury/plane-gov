"use client";

/**
 * ComboDropDown - HeadlessUI Combobox wrapper
 *
 * BACKWARDS COMPATIBILITY NOTE:
 * This component uses HeadlessUI Combobox for backwards compatibility with
 * existing consumers that directly use Combobox.Options, Combobox.Input,
 * and Combobox.Option as children. Those consumers import these primitives
 * directly from @headlessui/react.
 *
 * For new code, consider using CustomSearchSelect from @plane/ui which is
 * fully Radix-based.
 *
 * Consumer migration to Radix will require updating each consumer file to:
 * 1. Use the new Radix-based adapter components (ComboOptions, ComboOption, ComboInput)
 * 2. Stop importing from @headlessui/react
 */

import { Combobox } from "@headlessui/react";
import type { ElementType, KeyboardEventHandler, ReactNode, Ref } from "react";
import { forwardRef, useEffect, useRef, useState } from "react";

type Props = {
  as?: ElementType | undefined;
  ref?: Ref<HTMLElement> | undefined;
  tabIndex?: number | undefined;
  className?: string | undefined;
  value?: string | string[] | null;
  onChange?: (value: unknown) => void;
  disabled?: boolean | undefined;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement> | undefined;
  multiple?: boolean;
  renderByDefault?: boolean;
  button: ReactNode;
  children: ReactNode;
};

const ComboDropDown = forwardRef(function ComboDropDown(props: Props, ref) {
  const { button, renderByDefault = true, children, value, ...rest } = props;
  // Ensure controlled behavior - convert null to undefined for consistent controlled state
  const normalizedValue = value === null ? undefined : value;

  const dropDownButtonRef = useRef<HTMLDivElement | null>(null);

  const [shouldRender, setShouldRender] = useState(renderByDefault);

  const onHover = () => {
    setShouldRender(true);
  };

  useEffect(() => {
    const element = dropDownButtonRef.current;

    if (!element) return;

    element.addEventListener("mouseenter", onHover);

    return () => {
      element?.removeEventListener("mouseenter", onHover);
    };
  }, [dropDownButtonRef, shouldRender]);

  if (!shouldRender) {
    return (
      <div ref={dropDownButtonRef} className="h-full flex items-center">
        {button}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    <Combobox {...rest} value={normalizedValue} ref={ref}>
      <Combobox.Button as="div">{button}</Combobox.Button>
      {children}
    </Combobox>
  );
});

// Re-export HeadlessUI Combobox primitives for backwards compatibility
// These are kept for consumers that directly use them
const ComboOptions = Combobox.Options;
const ComboOption = Combobox.Option;
const ComboInput = Combobox.Input;

ComboDropDown.displayName = "ComboDropDown";

export { ComboDropDown, ComboOptions, ComboOption, ComboInput };

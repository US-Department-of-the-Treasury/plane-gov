"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

/**
 * Radix-based Collapsible primitive following shadcn/ui patterns.
 * Use this for expandable/collapsible content sections.
 *
 * @example
 * ```tsx
 * <Collapsible>
 *   <CollapsibleTrigger>Toggle content</CollapsibleTrigger>
 *   <CollapsibleContent>
 *     Hidden content that can be expanded.
 *   </CollapsibleContent>
 * </Collapsible>
 * ```
 */

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
const CollapsibleContent = CollapsiblePrimitive.Content;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

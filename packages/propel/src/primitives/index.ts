/**
 * Radix-based UI primitives following shadcn/ui patterns.
 *
 * These primitives provide accessible, unstyled (or minimally styled) building blocks
 * for creating custom UI components. They are built on Radix UI and styled with Tailwind CSS.
 *
 * Usage:
 * ```tsx
 * import { Popover, PopoverTrigger, PopoverContent } from "@plane/propel/primitives";
 * ```
 *
 * Note: These coexist with the existing Base UI components in @plane/propel.
 * The migration from Base UI to Radix is incremental - use these for new components
 * and gradually migrate existing components.
 */

// Popover - For positioned floating content
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose } from "./popover";

// Dialog - For modals and overlays
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog";

// AlertDialog - For confirmation dialogs that require user acknowledgment
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog";

// DropdownMenu - For action menus
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./dropdown-menu";

// Select - For single-value selection
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./select";

// Command - For command palettes and comboboxes
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./command";

// Checkbox - For boolean inputs
export { Checkbox } from "./checkbox";

// Switch - For toggle controls
export { Switch } from "./switch";

// Label - For accessible form labels
export { Label } from "./label";

// Separator - For visual dividers
export { Separator } from "./separator";

// Tooltip - For hover hints
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";

# @plane/propel

> Production-grade UI component library for Plane, built on Radix UI primitives and styled with Tailwind CSS.

## Quickstart

```tsx
// Import components from their specific paths
import { Button } from "@plane/propel/button";
import { Input } from "@plane/propel/input";
import { FormField } from "@plane/propel/form";
import { Checkbox, Label } from "@plane/propel/primitives";

// Use in your React components
function MyForm() {
  return (
    <FormField id="email" label="Email" required>
      <Input id="email" type="email" placeholder="you@example.com" />
    </FormField>
  );
}
```

**Expected outcome:** Fully accessible, government-ready UI components that work seamlessly with react-hook-form and follow WCAG 2.1 AA standards.

## Prerequisites

- React 18+
- TypeScript 5+
- Tailwind CSS (configured via `@plane/tailwind-config`)

## Component Catalog

### Form Components

| Component     | Export Path                | Description                                                 |
| ------------- | -------------------------- | ----------------------------------------------------------- |
| **Input**     | `@plane/propel/input`      | Text input with error/success states, 3 modes, 3 sizes      |
| **Textarea**  | `@plane/propel/textarea`   | Multi-line input with character count                       |
| **FormField** | `@plane/propel/form`       | Form layout wrapper with label, description, error handling |
| **Checkbox**  | `@plane/propel/primitives` | Radix Checkbox with indeterminate state support             |
| **Switch**    | `@plane/propel/primitives` | Toggle control (on/off)                                     |
| **Label**     | `@plane/propel/primitives` | Accessible form labels                                      |
| **Select**    | `@plane/propel/primitives` | Dropdown select with search                                 |

### Interactive Components

| Component        | Export Path                | Description                         |
| ---------------- | -------------------------- | ----------------------------------- |
| **Button**       | `@plane/propel/button`     | Primary UI button with variants     |
| **Dialog**       | `@plane/propel/primitives` | Modal dialogs and overlays          |
| **Popover**      | `@plane/propel/primitives` | Positioned floating content         |
| **DropdownMenu** | `@plane/propel/primitives` | Action menus with keyboard nav      |
| **Combobox**     | `@plane/propel/combobox`   | Searchable select with autocomplete |
| **Tooltip**      | `@plane/propel/primitives` | Hover hints with delay              |

### Layout Components

| Component      | Export Path                | Description                  |
| -------------- | -------------------------- | ---------------------------- |
| **Card**       | `@plane/propel/card`       | Content container            |
| **Accordion**  | `@plane/propel/accordion`  | Collapsible content sections |
| **Tabs**       | `@plane/propel/tabs`       | Tabbed navigation            |
| **Separator**  | `@plane/propel/primitives` | Visual divider               |
| **Scrollarea** | `@plane/propel/scrollarea` | Custom scrollbar container   |

### Feedback Components

| Component      | Export Path                 | Description           |
| -------------- | --------------------------- | --------------------- |
| **Toast**      | `@plane/propel/toast`       | Notification messages |
| **Banner**     | `@plane/propel/banner`      | Alert banners         |
| **EmptyState** | `@plane/propel/empty-state` | No-data placeholders  |
| **Skeleton**   | `@plane/propel/skeleton`    | Loading placeholders  |

### Data Visualization

| Component     | Export Path                       | Description              |
| ------------- | --------------------------------- | ------------------------ |
| **AreaChart** | `@plane/propel/charts/area-chart` | Time-series area chart   |
| **BarChart**  | `@plane/propel/charts/bar-chart`  | Vertical/horizontal bars |
| **LineChart** | `@plane/propel/charts/line-chart` | Multi-series line chart  |
| **PieChart**  | `@plane/propel/charts/pie-chart`  | Pie/donut charts         |

### Specialized Components

| Component       | Export Path                       | Description                       |
| --------------- | --------------------------------- | --------------------------------- |
| **Calendar**    | `@plane/propel/calendar`          | Date picker (react-day-picker)    |
| **Table**       | `@plane/propel/table`             | Data table with sorting/filtering |
| **Avatar**      | `@plane/propel/avatar`            | User profile images               |
| **Badge**       | `@plane/propel/badge`             | Status indicators                 |
| **EmojiPicker** | `@plane/propel/emoji-icon-picker` | Emoji/icon selection              |

## Common Patterns

### Form with Validation (react-hook-form)

```tsx
import { useForm, Controller } from "react-hook-form";
import { Input } from "@plane/propel/input";
import { Textarea } from "@plane/propel/textarea";
import { FormField } from "@plane/propel/form";
import { Button } from "@plane/propel/button";

interface FormData {
  name: string;
  email: string;
  bio: string;
}

function UserForm() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        control={control}
        name="name"
        rules={{ required: "Name is required" }}
        render={({ field, fieldState }) => (
          <FormField id="name" label="Full Name" required error={fieldState.error?.message}>
            <Input {...field} id="name" placeholder="John Doe" hasError={!!fieldState.error} />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="email"
        rules={{
          required: "Email is required",
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Invalid email address",
          },
        }}
        render={({ field, fieldState }) => (
          <FormField id="email" label="Email" required error={fieldState.error?.message}>
            <Input {...field} id="email" type="email" placeholder="you@example.com" hasError={!!fieldState.error} />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="bio"
        render={({ field, fieldState }) => (
          <FormField id="bio" label="Bio" description="Tell us about yourself" error={fieldState.error?.message}>
            <Textarea {...field} id="bio" placeholder="A brief description" maxLength={280} showCharacterCount />
          </FormField>
        )}
      />

      <Button type="submit">Create Account</Button>
    </form>
  );
}
```

### Input States

```tsx
import { Input } from "@plane/propel/input";

// Normal state
<Input placeholder="Enter text" />

// Error state
<Input hasError placeholder="Invalid input" />

// Success state
<Input hasSuccess placeholder="Valid input" />

// Disabled
<Input disabled placeholder="Cannot edit" />

// Transparent mode (for inline editing)
<Input mode="transparent" placeholder="Click to edit" />
```

### Textarea with Character Count

```tsx
import { Textarea } from "@plane/propel/textarea";

<Textarea placeholder="Enter bio" maxLength={280} showCharacterCount />;
```

### Dialog with Form

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@plane/propel/primitives";
import { Button } from "@plane/propel/button";
import { FormField } from "@plane/propel/form";
import { Input } from "@plane/propel/input";

function CreateProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form className="space-y-4">
          <FormField id="project-name" label="Project Name" required>
            <Input id="project-name" placeholder="My Project" />
          </FormField>
          <Button type="submit">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Development

### Running Storybook

```bash
cd packages/propel
pnpm storybook
```

Open [http://localhost:6006](http://localhost:6006) to view all components with live examples.

### Building

```bash
cd packages/propel
pnpm build
```

This compiles TypeScript and bundles components using `tsdown`. Output goes to `dist/`.

### Type Checking

```bash
cd packages/propel
pnpm check:types
```

### Linting

```bash
cd packages/propel
pnpm check:lint      # Check for issues
pnpm fix:lint        # Auto-fix issues
```

### Formatting

```bash
cd packages/propel
pnpm check:format    # Check formatting
pnpm fix:format      # Auto-format with Prettier
```

## Architecture

### Radix UI Migration

This package is in the process of migrating from Base UI to Radix UI primitives for better accessibility and maintenance. The migration is incremental:

- **Phase 0 (Complete):** Core primitives (Checkbox, Switch, Label, Dialog, Popover, etc.)
- **Phase 3 (Complete):** Form components (Input, Textarea, FormField)
- **Future phases:** Gradually migrate remaining Base UI components

Components in `@plane/propel/primitives` are built on Radix UI and follow the [shadcn/ui](https://ui.shadcn.com/) pattern - unstyled primitives with minimal Tailwind styling that can be customized per-component.

### Design System

All components follow these principles:

1. **Accessibility First:** WCAG 2.1 AA compliance, keyboard navigation, screen reader support
2. **Type-Safe:** Full TypeScript coverage with exported types
3. **Composable:** Small, focused components that work together
4. **Theme-Aware:** Use CSS variables from `@plane/tailwind-config` for colors
5. **Government-Ready:** No external dependencies on third-party services, telemetry, or analytics

### Styling Approach

Components use:

- **Tailwind CSS** for utility-first styling
- **CSS variables** for theme colors (defined in tailwind config)
- **class-variance-authority (cva)** for variant management
- **tailwind-merge (cn utility)** for conditional class merging

### File Structure

```
src/
├── button/
│   ├── button.tsx           # Component implementation
│   ├── button.stories.tsx   # Storybook stories
│   └── index.ts             # Public exports
├── primitives/
│   ├── checkbox.tsx         # Radix Checkbox wrapper
│   ├── checkbox.stories.tsx
│   ├── dialog.tsx           # Radix Dialog wrapper
│   └── index.ts             # Re-exports all primitives
├── utils/
│   └── index.ts             # cn() utility and helpers
└── styles/
    └── react-day-picker.css # Third-party component styles
```

## Troubleshooting

### Component doesn't show correct styles

**Cause:** Tailwind CSS not configured to scan propel package.

**Fix:** Ensure your app's `tailwind.config.js` includes:

```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/propel/src/**/*.{js,jsx,ts,tsx}", // Add this
  ],
  // ...
};
```

### TypeScript errors for missing types

**Cause:** Package not built or types not generated.

**Fix:**

```bash
cd packages/propel
pnpm build
```

### Storybook shows blank screen

**Cause:** Missing CSS import or Tailwind not loaded.

**Fix:** Check `.storybook/preview.tsx` imports Tailwind CSS:

```tsx
import "../src/styles/globals.css"; // or wherever your Tailwind entrypoint is
```

### Form validation not working

**Cause:** `hasError` prop not passed to Input/Textarea components.

**Fix:** Always pass `hasError` prop when using with react-hook-form:

```tsx
<Input {...field} hasError={!!fieldState.error} />
```

## Related Documentation

- [shadcn/ui Migration Plan](/Users/corcoss/code/plane-gov-phase-3/plans/shadcn-ui-migration.md)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## Success Metrics

This component library is successful when:

1. **Zero accessibility violations** in automated tests (axe-core)
2. **Full keyboard navigation** for all interactive components
3. **Self-service documentation** - developers can find answers in Storybook without asking teammates
4. **Type-safe imports** - TypeScript catches usage errors at compile time
5. **Fast iteration** - New components can be added in under 2 hours

## License

AGPL-3.0 (same as parent project)

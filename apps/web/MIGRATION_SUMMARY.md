# Workspace Stores Migration Summary

## Migration Status: COMPLETED

All four workspace stores have been successfully migrated from MobX to Zustand:

1. **API Token Store** - `/Users/corcoss/code/plane/apps/web/core/store/client/workspace-api-token.store.ts`
2. **Link Store** - `/Users/corcoss/code/plane/apps/web/core/store/client/workspace-link.store.ts`
3. **Webhook Store** - `/Users/corcoss/code/plane/apps/web/core/store/client/workspace-webhook.store.ts`
4. **Home Store** - `/Users/corcoss/code/plane/apps/web/core/store/client/workspace-home.store.ts`

## Migration Pattern

Each migrated store follows this structure:

```typescript
// 1. State and Actions interfaces
interface XxxStoreState { ... }
interface XxxStoreActions { ... }
export type XxxStore = XxxStoreState & XxxStoreActions;

// 2. Zustand store with hook
export const useXxxStore = create<XxxStore>()(
  (set, get) => ({ ... })
);

// 3. Legacy class wrapper for backward compatibility
export class XxxStoreLegacy implements IXxxStore {
  // Wraps the Zustand store for use in root.store.ts
}
```

## Changes Made in This Session

### 1. Fixed Import in workspace-home.store.ts
**Before:**
```typescript
import type { IWorkspaceLinkStore } from "../workspace/link.store";
import { WorkspaceLinkStore } from "../workspace/link.store";
```

**After:**
```typescript
import type { IWorkspaceLinkStore } from "./workspace-link.store";
import { WorkspaceLinkStoreLegacy } from "./workspace-link.store";
```

### 2. Fixed Exports in client/index.ts
**Before:**
```typescript
export { useWorkspaceWebhookStore, WorkspaceWebhookStoreLegacy as WorkspaceWebhookStore } from "./workspace-webhook.store";
export { useWorkspaceApiTokenStore, WorkspaceApiTokenStoreLegacy as WorkspaceApiTokenStore } from "./workspace-api-token.store";
export { useWorkspaceHomeStore, WorkspaceHomeStoreLegacy as WorkspaceHomeStore } from "./workspace-home.store";
```

**After:**
```typescript
export { useWebhookStore, WebhookStoreLegacy as WebhookStore } from "./workspace-webhook.store";
export { useWorkspaceApiTokenStore, ApiTokenStoreLegacy as ApiTokenStore } from "./workspace-api-token.store";
export { useWorkspaceHomeStore, HomeStoreLegacy as HomeStore } from "./workspace-home.store";
```

## Store Details

### 1. API Token Store (`workspace-api-token.store.ts`)

**Hook:** `useWorkspaceApiTokenStore`  
**Legacy Class:** `ApiTokenStoreLegacy`

**Features:**
- Fetch all API tokens
- Fetch single token details
- Create new API token
- Delete API token
- Get token by ID

### 2. Link Store (`workspace-link.store.ts`)

**Hook:** `useWorkspaceLinkStore`  
**Legacy Class:** `WorkspaceLinkStoreLegacy`

**Features:**
- Manage workspace links (URLs, resources)
- Create, update, delete links
- Modal state management
- Link data management by workspace

### 3. Webhook Store (`workspace-webhook.store.ts`)

**Hook:** `useWebhookStore`  
**Legacy Class:** `WebhookStoreLegacy`

**Features:**
- Fetch all webhooks
- Create, update, delete webhooks
- Secret key management (create, regenerate, clear)
- Get webhook by ID
- Current webhook computed property (based on router)

**Special Note:** The `WebhookStoreLegacy` class maintains a `currentWebhook` computed property that depends on `rootStore.router.webhookId`, demonstrating cross-store dependencies.

### 4. Home Store (`workspace-home.store.ts`)

**Hook:** `useWorkspaceHomeStore`  
**Legacy Class:** `HomeStoreLegacy`

**Features:**
- Dashboard widget management
- Widget ordering/reordering
- Widget enable/disable toggle
- Widget settings UI state
- Nested quick links store

**Special Note:** The `HomeStoreLegacy` class creates an instance of `WorkspaceLinkStoreLegacy` for the `quickLinks` property, showing nested store composition.

## Architecture Notes

- **Old MobX stores** remain in `/Users/corcoss/code/plane/apps/web/core/store/workspace/`
- **New Zustand stores** are in `/Users/corcoss/code/plane/apps/web/core/store/client/`
- The old stores are still used by `workspace/index.ts` (WorkspaceRootStore)
- New code should use the Zustand hooks directly (e.g., `useWorkspaceApiTokenStore()`)
- Legacy classes enable gradual migration by maintaining API compatibility

## Usage Examples

### Using the Zustand hooks (Recommended for new code):

```typescript
import { useWorkspaceApiTokenStore } from "@/core/store/client";

function MyComponent() {
  const { apiTokens, fetchApiTokens } = useWorkspaceApiTokenStore();
  // Use the store...
}
```

### Using the Legacy classes (Existing code compatibility):

```typescript
// In root.store.ts or other MobX-based code
import { ApiTokenStoreLegacy } from "@/core/store/client";

const apiTokenStore = new ApiTokenStoreLegacy(rootStore);
const tokens = apiTokenStore.apiTokens;
```

## Testing

TypeScript compilation shows no errors related to these migrated stores. Pre-existing errors in other files (TanStack Query integration, issue stores) are unrelated to this migration.

## Next Steps (Future Work)

1. Update `workspace/index.ts` to use the new Zustand legacy classes instead of old MobX classes
2. Remove old MobX store files from `workspace/` folder after confirming all references are updated
3. Gradually migrate components to use Zustand hooks directly instead of legacy classes
4. Remove legacy class wrappers once all consuming code is updated


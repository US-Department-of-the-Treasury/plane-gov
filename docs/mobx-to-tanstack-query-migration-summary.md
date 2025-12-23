# MobX to TanStack Query + Zustand Migration Summary

This document summarizes the migration of workspace, user, and member stores from MobX to TanStack Query + Zustand.

## Migration Completed

### Query Hooks Created

All server data operations have been migrated to TanStack Query hooks:

#### 1. Workspace Queries (`/apps/web/core/store/queries/workspace.ts`)
- ✅ `useWorkspaces()` - Fetch all workspaces
- ✅ `useWorkspaceDetails(workspaceSlug)` - Fetch workspace details
- ✅ `useCreateWorkspace()` - Create new workspace
- ✅ `useUpdateWorkspace()` - Update workspace
- ✅ `useDeleteWorkspace()` - Delete workspace
- ✅ `useSidebarNavigationPreferences(workspaceSlug)` - Fetch sidebar preferences
- ✅ `useUpdateSidebarPreference()` - Update single sidebar preference
- ✅ `useUpdateBulkSidebarPreferences()` - Update multiple sidebar preferences
- ✅ `useWorkspaceMemberMe(workspaceSlug)` - Get current user's workspace membership
- ✅ `useWorkspaceViews(workspaceSlug)` - Fetch workspace views (global views)
- ✅ `useCreateWorkspaceView()` - Create workspace view
- ✅ `useUpdateWorkspaceView()` - Update workspace view
- ✅ `useDeleteWorkspaceView()` - Delete workspace view

#### 2. API Token Queries (`/apps/web/core/store/queries/api-token.ts`)
- ✅ `useApiTokens(workspaceSlug)` - Fetch all API tokens
- ✅ `useApiTokenDetails(workspaceSlug, tokenId)` - Fetch API token details
- ✅ `useCreateApiToken()` - Create new API token
- ✅ `useDeleteApiToken()` - Delete API token

#### 3. Workspace Links Queries (`/apps/web/core/store/queries/workspace-links.ts`)
- ✅ `useWorkspaceLinks(workspaceSlug)` - Fetch workspace links (home quick links)
- ✅ `useWorkspaceLinkDetails(workspaceSlug, linkId)` - Fetch link details
- ✅ `useCreateWorkspaceLink()` - Create new link
- ✅ `useUpdateWorkspaceLink()` - Update link
- ✅ `useDeleteWorkspaceLink()` - Delete link

#### 4. Home/Widget Queries (`/apps/web/core/store/queries/home.ts`)
- ✅ `useHomeWidgets(workspaceSlug)` - Fetch home widgets
- ✅ `useToggleWidget()` - Toggle widget on/off
- ✅ `useReorderWidget()` - Reorder widgets

#### 5. User Queries (`/apps/web/core/store/queries/user.ts`)
- ✅ `useCurrentUser()` - Fetch current user
- ✅ `useUpdateCurrentUser()` - Update current user
- ✅ `useCurrentUserSettings()` - Fetch user settings
- ✅ `useCurrentUserProfile()` - Fetch user profile
- ✅ `useUpdateCurrentUserProfile()` - Update user profile
- ✅ `useFinishUserOnboarding()` - Complete user onboarding
- ✅ `useSetPassword()` - Set user password (first-time)
- ✅ `useChangePassword()` - Change user password
- ✅ `useDeactivateAccount()` - Deactivate user account
- ✅ `useUpdateTourCompleted()` - Mark tour as completed

#### 6. Member Queries (`/apps/web/core/store/queries/member.ts`)

**Workspace Members:**
- ✅ `useWorkspaceMembers(workspaceSlug)` - Fetch workspace members
- ✅ `useWorkspaceMemberInvitations(workspaceSlug)` - Fetch workspace invitations
- ✅ `useUpdateWorkspaceMember()` - Update workspace member role
- ✅ `useRemoveWorkspaceMember()` - Remove workspace member
- ✅ `useInviteWorkspaceMembers()` - Invite members to workspace
- ✅ `useUpdateWorkspaceMemberInvitation()` - Update invitation
- ✅ `useDeleteWorkspaceMemberInvitation()` - Delete invitation

**Project Members:**
- ✅ `useProjectMembers(workspaceSlug, projectId)` - Fetch project members
- ✅ `useProjectMemberPreferences(workspaceSlug, projectId, memberId)` - Fetch member preferences
- ✅ `useUpdateProjectMemberPreferences()` - Update member preferences
- ✅ `useBulkAddProjectMembers()` - Bulk add members to project
- ✅ `useUpdateProjectMemberRole()` - Update project member role
- ✅ `useRemoveProjectMember()` - Remove project member

### Query Keys Updated

Added to `/apps/web/core/store/queries/query-keys.ts`:
- `queryKeys.apiTokens.*` - API token query keys
- `queryKeys.workspaceLinks.*` - Workspace link query keys
- `queryKeys.workspaceSidebarPreferences.*` - Sidebar preferences query keys
- `queryKeys.members.workspaceInvitations()` - Workspace invitation keys
- `queryKeys.members.projectPreferences()` - Project member preferences keys

## Migration Pattern

### Before (MobX)

```typescript
// Using MobX store
import { observer } from "mobx-react";
import { useMobxStore } from "@/hooks/store";

export const MyComponent = observer(() => {
  const { workspace } = useMobxStore();

  useEffect(() => {
    workspace.fetchWorkspaces();
  }, [workspace]);

  const handleUpdate = async () => {
    await workspace.updateWorkspace(workspaceSlug, { name: "New Name" });
  };

  return (
    <div>
      {workspace.loader && <Loader />}
      {workspace.workspaces.map(ws => (
        <div key={ws.id}>{ws.name}</div>
      ))}
    </div>
  );
});
```

### After (TanStack Query)

```typescript
// Using TanStack Query hooks
import { useWorkspaces, useUpdateWorkspace } from "@/store/queries/workspace";

export const MyComponent = () => {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { mutate: updateWorkspace } = useUpdateWorkspace();

  const handleUpdate = () => {
    updateWorkspace({ workspaceSlug, data: { name: "New Name" } });
  };

  return (
    <div>
      {isLoading && <Loader />}
      {workspaces?.map(ws => (
        <div key={ws.id}>{ws.name}</div>
      ))}
    </div>
  );
};
```

## Key Benefits

### 1. Automatic Caching & Revalidation
TanStack Query automatically caches data and revalidates when needed:
```typescript
// Data is cached for 5 minutes, automatically refetched when stale
const { data: workspaces } = useWorkspaces();
```

### 2. Optimistic Updates
Mutations support optimistic updates with automatic rollback on error:
```typescript
const { mutate: updateWorkspace } = useUpdateWorkspace();
// UI updates immediately, rolls back if API call fails
updateWorkspace({ workspaceSlug, data: { name: "New Name" } });
```

### 3. Loading & Error States
Built-in loading and error state management:
```typescript
const { data, isLoading, error, refetch } = useWorkspaces();

if (isLoading) return <Loader />;
if (error) return <Error error={error} onRetry={refetch} />;
return <WorkspacesList workspaces={data} />;
```

### 4. No More Manual runInAction
No need for MobX's `runInAction` or observable decorators:
```typescript
// MobX - requires runInAction for async
runInAction(() => {
  this.workspaces = response;
});

// TanStack Query - just return data
queryFn: () => workspaceService.userWorkspaces()
```

## Usage Examples

### Fetching Data

```typescript
// Simple fetch
const { data, isLoading } = useWorkspaces();

// Fetch with dependencies
const { data: members } = useProjectMembers(workspaceSlug, projectId);

// Manually trigger refetch
const { data, refetch } = useWorkspaces();
refetch(); // Refetch data

// Access data from cache
import { useQueryClient } from "@tanstack/react-query";
const queryClient = useQueryClient();
const cachedWorkspaces = queryClient.getQueryData(queryKeys.workspaces.all());
```

### Mutations with Optimistic Updates

```typescript
const { mutate, isPending } = useUpdateWorkspace();

mutate(
  { workspaceSlug, data: { name: "New Name" } },
  {
    onSuccess: (data) => {
      toast.success("Workspace updated!");
    },
    onError: (error) => {
      toast.error("Failed to update workspace");
    },
  }
);
```

### Dependent Queries

```typescript
// Only fetch project members if workspace is loaded
const { data: workspace } = useWorkspaceDetails(workspaceSlug);
const { data: members } = useProjectMembers(
  workspace?.slug ?? "",
  projectId,
  // enabled controls when query runs
  { enabled: !!workspace }
);
```

### Parallel Queries

```typescript
// Fetch multiple resources in parallel
const { data: user } = useCurrentUser();
const { data: workspaces } = useWorkspaces();
const { data: settings } = useCurrentUserSettings();

// All three requests fire simultaneously
// No manual Promise.all needed!
```

## Utility Functions

Each query module exports utility functions for data transformations:

```typescript
import {
  getWorkspaceBySlug,
  getWorkspaceById
} from "@/store/queries/workspace";

const { data: workspaces } = useWorkspaces();
const currentWorkspace = getWorkspaceBySlug(workspaces, workspaceSlug);
```

Available utility functions:
- **Workspace**: `getWorkspaceBySlug`, `getWorkspaceById`, `getWorkspaceIds`
- **Home**: `isAnyWidgetEnabled`, `getOrderedWidgets`, `getWidgetByKey`
- **Links**: `getWorkspaceLinkById`
- **Tokens**: `getApiTokenById`
- **Members**: `getWorkspaceMemberByUserId`, `getProjectMemberByUserId`

## Client-Side UI State (Zustand)

For pure UI state that doesn't belong in the server cache, use Zustand stores:

```typescript
// Example: Sidebar collapsed state
import { create } from 'zustand';

interface SidebarStore {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: false,
  toggleSidebar: () => set((state) => ({ collapsed: !state.collapsed })),
}));

// Usage
const { collapsed, toggleSidebar } = useSidebarStore();
```

## Migration Checklist for Remaining Stores

When migrating other MobX stores, follow this pattern:

1. **Identify data type:**
   - Server data → TanStack Query
   - UI state → Zustand
   - Derived/computed values → Utility functions

2. **Create query hooks:**
   - Add query keys to `query-keys.ts`
   - Create hooks in `queries/` directory
   - Implement optimistic updates for mutations

3. **Remove MobX dependencies:**
   - Remove `makeObservable`, `observable`, `action`
   - Remove `observer` from components
   - Remove `runInAction` calls

4. **Update components:**
   - Replace `useMobxStore()` with query hooks
   - Replace `useEffect` fetch calls with query hooks
   - Replace `.loader` with `isLoading`
   - Replace method calls with mutations

## Performance Considerations

### Stale Time
- **5 minutes** (default): User data, workspaces, members
- **2 minutes**: Invitations (change frequently)
- **1 minute**: Real-time data like notifications

### GC Time
- **30 minutes** (default): Keep data in cache even when unused

### Optimistic Updates
All mutations support optimistic updates with automatic rollback on failure.

## Testing

TanStack Query is easier to test than MobX:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkspaces } from './workspace';

test('fetches workspaces', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useWorkspaces(), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(3);
});
```

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TanStack Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- Migration best practices: `/docs/mobx-to-tanstack-query-migration-best-practices.md`

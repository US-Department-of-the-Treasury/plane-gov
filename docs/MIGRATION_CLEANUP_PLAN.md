# MobX Migration Cleanup Plan

**Status:** MobX library removed, but legacy architecture patterns remain
**Goal:** Remove all "Legacy wrapper" patterns and modernize to pure Zustand/TanStack Query
**Window:** Pre-production - no data migration concerns

---

## Executive Summary

The MobX library has been completely removed, but 22 "Legacy wrapper" classes exist to maintain backward compatibility with the old class-based `rootStore` architecture. These wrappers delegate to the new Zustand stores but add unnecessary complexity and confusion.

**Before (current):**
```
Component → rootStore.label.getProjectLabels() → LabelStoreLegacy → useLabelStore.getState()
```

**After (target):**
```
Component → useProjectLabels(projectId) → TanStack Query
```

---

## Phase 1: Legacy Store Wrappers (22 classes)

These classes exist solely to maintain the old `rootStore.xxx` API. Each wraps a Zustand store.

| File | Legacy Class | Zustand Store | TanStack Hooks |
|------|--------------|---------------|----------------|
| `client/analytics.store.ts` | `AnalyticsStoreLegacy` | `useAnalyticsStore` | `useWorkspaceAnalytics` |
| `client/editor-asset.store.ts` | `EditorAssetStoreLegacy` | `useEditorAssetStore` | - |
| `client/epic-filter.store.ts` | `EpicFilterStoreLegacy` | `useEpicFilterStore` | - |
| `client/epic.store.ts` | `EpicStoreLegacy` | `useEpicStore` | `useProjectEpics`, `useCreateEpic`, etc. |
| `client/estimate-point.store.ts` | `EstimatePointStoreLegacy` | `useEstimatePointStore` | `useProjectEstimates` |
| `client/global-view.store.ts` | `GlobalViewStoreLegacy` | `useGlobalViewStore` | `useWorkspaceViews` |
| `client/label.store.ts` | `LabelStoreLegacy` | `useLabelStore` | `useProjectLabels`, `useCreateLabel`, etc. |
| `client/multiple-select.store.ts` | `MultipleSelectStoreLegacy` | `useMultipleSelectStore` | - |
| `client/notification.store.ts` | `NotificationStoreLegacy` | `createNotificationStore` | `useNotifications` |
| `client/power-k.store.ts` | `PowerKStoreLegacy` | `usePowerKStore` | - |
| `client/project-publish.store.ts` | `ProjectPublishStoreLegacy` | `useProjectPublishStore` | `useProjectPublish` |
| `client/project-view.store.ts` | `ProjectViewStoreLegacy` | `useProjectViewStore` | `useProjectViews` |
| `client/router.store.ts` | `RouterStoreLegacy` | `useRouterStore` | - |
| `client/sprint-filter.store.ts` | `SprintFilterStoreLegacy` | `useSprintFilterStore` | - |
| `client/sprint.store.ts` | `SprintStoreLegacy` | `useSprintStore` | `useProjectSprints`, `useCreateSprint`, etc. |
| `client/state.store.ts` | `StateStoreLegacy` | `useStateStore` | `useProjectStates`, `useCreateState`, etc. |
| `client/theme.store.ts` | `ThemeStoreLegacy` | `useThemeStore` | - |
| `client/workspace-api-token.store.ts` | `ApiTokenStoreLegacy` | `useWorkspaceApiTokenStore` | `useApiTokens` |
| `client/workspace-home.store.ts` | `HomeStoreLegacy` | `useWorkspaceHomeStore` | `useWorkspaceHome` |
| `client/workspace-link.store.ts` | `WorkspaceLinkStoreLegacy` | `useWorkspaceLinkStore` | `useWorkspaceLinks` |
| `client/workspace-notifications.store.ts` | `WorkspaceNotificationStoreLegacy` | `useWorkspaceNotificationStore` | `useNotifications` |
| `client/workspace-webhook.store.ts` | `WebhookStoreLegacy` | `useWebhookStore` | `useWebhooks` |

### Action Items:
- [ ] For each legacy class, find all usages via `rootStore.xxx`
- [ ] Replace with direct hook usage in components
- [ ] Delete the legacy class and its interface
- [ ] Update exports in `client/index.ts`

---

## Phase 2: Root Store Files

These files orchestrate the legacy class instances:

| File | Description | Action |
|------|-------------|--------|
| `apps/web/core/store/root.store.ts` | Core root store | Remove after Phase 1 |
| `apps/web/ce/store/root.store.ts` | CE root store | Remove after Phase 1 |
| `apps/web/ee/store/root.store.ts` | EE root store | Remove after Phase 1 |
| `apps/web/core/lib/store-context.tsx` | React context provider | Remove after Phase 1 |
| `apps/web/app/provider.tsx` | App provider with store | Update to remove store context |

---

## Phase 3: Store Access Hooks

These hooks provide access to rootStore and need to be replaced:

| File | Hook | Replace With |
|------|------|--------------|
| `hooks/store/use-issue-store-reactive.ts` | `useIssueStoreReactive` | Direct Zustand hooks |
| `hooks/store/use-workspace.ts` | `useWorkspace` | `useWorkspace` TanStack hook |
| `hooks/store/user/user-permissions.ts` | `useUserPermissions` | Direct Zustand hook |
| `hooks/store/use-issues.ts` | `useIssues` | TanStack Query hooks |
| `hooks/store/use-member.ts` | `useMember` | `useWorkspaceMembers` TanStack hook |
| `hooks/store/use-issue-detail.ts` | `useIssueDetail` | TanStack Query hooks |
| `hooks/use-timeline-chart.ts` | - | Update to use hooks |
| `hooks/use-issue-layout-store.ts` | - | Update to use hooks |

---

## Phase 4: Non-Legacy Store Classes

These store classes are not legacy wrappers but still use the old class pattern. Consider converting to pure Zustand:

### Issue Stores (High Complexity)
- [ ] `issue/root.store.ts` - Issue root store coordinator
- [ ] `issue/helpers/base-issues.store.ts` - Base issue store
- [ ] `issue/helpers/base-issues-utils.ts` - Issue utilities
- [ ] `issue/issue-details/root.store.ts` - Issue detail coordinator
- [ ] `issue/project/issue.store.ts` - Project issues
- [ ] `issue/project/filter.store.ts` - Project issue filters
- [ ] `issue/workspace/issue.store.ts` - Workspace issues
- [ ] `issue/workspace/filter.store.ts` - Workspace issue filters
- [ ] `issue/archived/issue.store.ts` - Archived issues
- [ ] `issue/archived/filter.store.ts` - Archived issue filters
- [ ] `issue/sprint/issue.store.ts` - Sprint issues
- [ ] `issue/sprint/filter.store.ts` - Sprint issue filters
- [ ] `issue/epic/issue.store.ts` - Epic issues
- [ ] `issue/epic/filter.store.ts` - Epic issue filters
- [ ] `issue/project-views/issue.store.ts` - View issues
- [ ] `issue/project-views/filter.store.ts` - View issue filters
- [ ] `issue/workspace-draft/issue.store.ts` - Draft issues
- [ ] `issue/workspace-draft/filter.store.ts` - Draft issue filters
- [ ] `issue/profile/issue.store.ts` - Profile issues
- [ ] `issue/profile/filter.store.ts` - Profile issue filters

### Issue Detail Stores
- [ ] `issue/issue-details/issue.store.ts` - Issue detail
- [ ] `issue/issue-details/comment.store.ts` - Comments
- [ ] `issue/issue-details/reaction.store.ts` - Reactions
- [ ] `issue/issue-details/comment_reaction.store.ts` - Comment reactions
- [ ] `issue/issue-details/attachment.store.ts` - Attachments
- [ ] `issue/issue-details/link.store.ts` - Links
- [ ] `issue/issue-details/relation.store.ts` - Relations
- [ ] `issue/issue-details/sub_issues.store.ts` - Sub-issues
- [ ] `issue/issue-details/sub_issues_filter.store.ts` - Sub-issue filters
- [ ] `issue/issue-details/subscription.store.ts` - Subscriptions
- [ ] `issue/issue-details/ui.store.ts` - UI state

### View Stores
- [ ] `issue/issue_kanban_view.store.ts` - Kanban view
- [ ] `issue/issue_calendar_view.store.ts` - Calendar view
- [ ] `issue/issue_gantt_view.store.ts` - Gantt view

### Member Stores
- [ ] `member/workspace/workspace-member.store.ts` - Workspace members
- [ ] `member/workspace/workspace-member-filters.store.ts` - Member filters
- [ ] `member/project/base-project-member.store.ts` - Project members
- [ ] `member/project/project-member-filters.store.ts` - Project member filters

### Project Stores
- [ ] `project/project.store.ts` - Projects
- [ ] `project/project_filter.store.ts` - Project filters
- [ ] `project/project-publish.store.ts` - Project publish

### User Stores
- [ ] `user/account.store.ts` - User account
- [ ] `user/profile.store.ts` - User profile
- [ ] `user/settings.store.ts` - User settings
- [ ] `user/base-permissions.store.ts` - Base permissions

### Workspace Stores
- [ ] `workspace/api-token.store.ts` - API tokens
- [ ] `workspace/webhook.store.ts` - Webhooks
- [ ] `workspace/link.store.ts` - Links
- [ ] `workspace/home.ts` - Home

### Other Stores
- [ ] `estimates/project-estimate.store.ts` - Project estimates
- [ ] `estimates/estimate-point.ts` - Estimate points
- [ ] `inbox/project-inbox.store.ts` - Project inbox
- [ ] `inbox/inbox-issue.store.ts` - Inbox issues
- [ ] `pages/base-page.ts` - Base page
- [ ] `pages/project-page.ts` - Project page
- [ ] `pages/project-page.store.ts` - Project page store
- [ ] `pages/page-editor-info.ts` - Page editor info
- [ ] `timeline/issues-timeline.store.ts` - Issues timeline
- [ ] `timeline/epics-timeline.store.ts` - Epics timeline
- [ ] `notifications/notification.ts` - Notification
- [ ] `notifications/workspace-notifications.store.ts` - Workspace notifications

---

## Phase 5: CE/EE Store Files (70 files)

CE and EE directories have their own store implementations that extend core:

### CE Stores (55 files)
- `ce/store/root.store.ts` - CE root store
- `ce/store/client/*.ts` - CE client stores (22 files)
- `ce/store/issue/**/*.ts` - CE issue stores
- `ce/store/member/*.ts` - CE member stores
- `ce/store/timeline/*.ts` - CE timeline stores
- ... and more

### EE Stores (15 files)
- `ee/store/root.store.ts` - EE root store
- `ee/store/issue/**/*.ts` - EE issue stores
- ... and more

---

## Phase 6: Components Using rootStore

Components that access stores via rootStore pattern (16 components):

| File | Usage | Migration |
|------|-------|-----------|
| `components/issues/issue-layouts/roots/sprint-layout-root.tsx` | Issue store | Use TanStack hooks |
| `components/issues/issue-layouts/roots/all-issue-layout-root.tsx` | Issue store | Use TanStack hooks |
| `components/issues/issue-layouts/roots/project-layout-root.tsx` | Issue store | Use TanStack hooks |
| `components/issues/issue-layouts/roots/project-view-layout-root.tsx` | Issue store | Use TanStack hooks |
| `components/issues/issue-layouts/roots/archived-issue-layout-root.tsx` | Issue store | Use TanStack hooks |
| `components/issues/issue-layouts/roots/epic-layout-root.tsx` | Issue store | Use TanStack hooks |
| `components/profile/profile-issues.tsx` | Issue store | Use TanStack hooks |

---

## Migration Strategy

### Recommended Order:
1. **Start with leaf stores** - Stores with no dependencies on other stores
2. **Work up the tree** - Then stores that depend on leaf stores
3. **Root stores last** - Finally the root store coordinators

### For Each Store:
1. Identify all usages of `rootStore.xxx`
2. Create/verify TanStack Query hooks exist
3. Update components to use hooks directly
4. Remove legacy class
5. Update tests
6. Verify no regressions

### Testing Strategy:
- Run full E2E test suite after each store migration
- Use TypeScript compiler to catch missed usages
- Manual testing of affected features

---

## Success Criteria

- [ ] No `*StoreLegacy` classes in codebase
- [ ] No `rootStore` pattern in components
- [ ] No store context provider needed
- [ ] All state access via Zustand hooks or TanStack Query
- [ ] Clean architecture that anyone can understand
- [ ] All E2E tests passing

---

## Tracking

### Completed:
- [x] MobX library removed
- [x] TanStack Query hooks created for most entities
- [x] Zustand stores created for client state

### In Progress:
- [ ] Phase 1: Legacy Store Wrappers

### Not Started:
- [ ] Phase 2: Root Store Files
- [ ] Phase 3: Store Access Hooks
- [ ] Phase 4: Non-Legacy Store Classes
- [ ] Phase 5: CE/EE Store Files
- [ ] Phase 6: Components Using rootStore

# Phase 4: Class-Based Store Migration Plan

**Status:** Wave 1 Complete ✅
**Goal:** Remove remaining class-based store wrappers and migrate to direct Zustand/TanStack Query hooks
**Estimated Scope:** ~50 class stores, ~542 component files

**Last Verified:** Dec 26, 2025

- 211/211 E2E tests passing
- Visual verification complete (Issues, Sprints, Epics, Workspace Views)

---

## Current Architecture

The codebase is in a hybrid state:

```
Component → rootStore.issue.projectIssuesFilter → ProjectIssuesFilter class → useProjectIssuesFilterStore (Zustand)
```

**Target Architecture:**

```
Component → useProjectIssueFilters() (reactive hook) → useProjectIssuesFilterStore (Zustand)
```

Most stores already have Zustand backends. The class wrappers exist for backward compatibility but add:

- Unnecessary indirection
- Cognitive overhead
- Type complexity
- rootStore coupling

---

## Migration Waves

### Wave 1: Filter Stores (Low Risk, High Impact)

Filter stores already have Zustand backends. Migration involves:

1. Creating reactive hooks in `use-issue-store-reactive.ts`
2. Updating components to use new hooks
3. Removing class wrappers

| Store Class                  | Zustand Store                     | New Hook                               | Components Using |
| ---------------------------- | --------------------------------- | -------------------------------------- | ---------------- |
| `ProjectIssuesFilter`        | `useProjectIssuesFilterStore`     | `useProjectIssueFilters()`             | ✅ Done          |
| `SprintIssuesFilter`         | `useSprintIssuesFilterStore`      | `useSprintIssueFilters()`              | ✅ Done          |
| `EpicIssuesFilter`           | `useEpicIssuesFilterStore`        | `useEpicIssueFilters()`                | ✅ Done          |
| `ProjectViewIssuesFilter`    | `useProjectViewIssuesFilterStore` | `useProjectViewIssueFilters()`         | ✅ Done          |
| `ArchivedIssuesFilter`       | `useArchivedIssuesFilterStore`    | `useArchivedIssueFilters()`            | ✅ Done          |
| `ProfileIssuesFilter`        | `useProfileIssuesFilterStore`     | `useProfileIssueFilters()`             | ✅ Done          |
| `WorkspaceIssuesFilter`      | `useWorkspaceIssuesFilterStore`   | `useWorkspaceViewIssueFilters(viewId)` | ✅ Done          |
| `WorkspaceDraftIssuesFilter` | `useWorkspaceDraftFilterStore`    | `useWorkspaceDraftIssues()`            | ✅ Done          |
| `TeamIssuesFilter`           | -                                 | -                                      | EE only          |
| `TeamViewIssuesFilter`       | -                                 | -                                      | EE only          |

**Status:** ✅ All 8 CE filter stores migrated to reactive hooks

### Wave 2: Issue Stores (Medium Complexity)

These handle pagination, grouping, and CRUD operations. Zustand stores exist but class methods need migration.

| Store Class            | Migration Approach                   |
| ---------------------- | ------------------------------------ |
| `ProjectIssues`        | Keep Zustand store, expose via hooks |
| `SprintIssues`         | Keep Zustand store, expose via hooks |
| `EpicIssues`           | Keep Zustand store, expose via hooks |
| `ProjectViewIssues`    | Keep Zustand store, expose via hooks |
| `ArchivedIssues`       | Keep Zustand store, expose via hooks |
| `ProfileIssues`        | Keep Zustand store, expose via hooks |
| `WorkspaceIssues`      | Keep Zustand store, expose via hooks |
| `WorkspaceDraftIssues` | Keep Zustand store, expose via hooks |

**Key insight:** The `useIssuesActions(storeType)` hook already provides actions. The class stores mainly provide:

- `fetchIssues` / `fetchNextIssues` → Already in `useIssuesActions`
- `updateIssue` / `removeIssue` → Already in `useIssuesActions`
- `getPaginationData` → Move to Zustand hook
- `viewFlags` → Move to Zustand hook
- `groupedIssueIds` → Already have `useGroupedIssueIds(storeType)`

### Wave 3: Issue Detail Stores (Medium Complexity)

Already migrated to Zustand! The class `IssueDetail` delegates to Zustand stores:

| Store                    | Zustand Store               | Status     |
| ------------------------ | --------------------------- | ---------- |
| `IssueReactionStore`     | `useIssueReactionStore`     | ✅ Zustand |
| `IssueAttachmentStore`   | `useIssueAttachmentStore`   | ✅ Zustand |
| `IssueCommentStore`      | `useIssueCommentStore`      | ✅ Zustand |
| `IssueLinkStore`         | `useIssueLinkStore`         | ✅ Zustand |
| `IssueRelationStore`     | `useIssueRelationStore`     | ✅ Zustand |
| `IssueSubIssuesStore`    | `useIssueSubIssuesStore`    | ✅ Zustand |
| `IssueSubscriptionStore` | `useIssueSubscriptionStore` | ✅ Zustand |
| `IssueDetailUIStore`     | `useIssueDetailUIStore`     | ✅ Zustand |

**Migration:** Remove `IssueDetail` class, have components use Zustand stores directly.

### Wave 4: IssueRootStore Decomposition (High Complexity)

The `IssueRootStore` coordinates all issue stores. After Waves 1-3, it can be decomposed:

Current responsibilities:

- Router state sync → Move to `useRouterStore` (already Zustand)
- State/Label/Member maps → Already reading from Zustand stores via getters
- Sub-store coordination → Can be replaced with individual hooks

**Plan:**

1. Ensure all sub-stores have direct Zustand hooks
2. Replace `rootStore.issue.xxx` patterns with direct hooks
3. Remove `IssueRootStore` class
4. Keep only `createIssueRootStore` Zustand store for minimal shared state

### Wave 5: Other Stores (Low Complexity)

These stores have simpler patterns:

| Store                  | Current State   | Migration          |
| ---------------------- | --------------- | ------------------ |
| `CalendarStore`        | Class + Zustand | Keep Zustand       |
| `IssueKanBanViewStore` | Class           | Convert to Zustand |
| `IssueGanttViewStore`  | Class           | Convert to Zustand |
| `WorkspaceMemberStore` | Has Zustand     | Expose via hooks   |
| `ProjectMemberStore`   | Has Zustand     | Expose via hooks   |

---

## Component Migration Strategy

### Step 1: Identify Patterns

Search for these patterns and replace:

```typescript
// OLD: rootStore access via useIssues
const { issues, issuesFilter } = useIssues(EIssuesStoreType.PROJECT);
const displayFilters = issuesFilter.issueFilters?.displayFilters;

// NEW: Direct reactive hooks
const issueFilters = useProjectIssueFilters();
const displayFilters = issueFilters?.displayFilters;
```

```typescript
// OLD: Action via useIssuesActions + store access
const { updateIssue } = useIssuesActions(storeType);
const { issues } = useIssues(storeType);
issues.getPaginationData(...)

// NEW: Everything via hooks
const { updateIssue } = useIssuesActions(storeType);
const paginationData = useIssuePaginationData(storeType, groupId);
```

### Step 2: Priority Components

1. **Layout Roots** (most impactful) - Already mostly done
2. **Headers** (filters display) - Mostly done
3. **Quick Actions** - Mostly done
4. **Issue Detail components** - Use Zustand directly
5. **List/Kanban/Calendar views** - Use grouped issue hooks

### Step 3: Testing Protocol

For each component migration:

1. Run `pnpm check:types` - Catch compile errors
2. Run affected E2E tests - Verify functionality
3. Visual verification with Playwright MCP - Check UI renders

---

## Execution Checklist

### Wave 1: Filter Stores ✅ COMPLETE

- [x] Add `useWorkspaceViewIssueFilters(viewId)` reactive hook
- [x] Add `useWorkspaceDraftIssues()` reactive hook
- [x] Update components using workspace filters
- [x] Test with Playwright MCP (Dec 26, 2025)

### Wave 2: Issue Store Hooks

- [ ] Add `useIssuePaginationData(storeType)` hook
- [ ] Add `useIssueViewFlags(storeType)` hook
- [ ] Update components to use new hooks
- [ ] Test with Playwright MCP

### Wave 3: Issue Detail Migration

- [ ] Identify all `rootStore.issue.issueDetail` usages
- [ ] Replace with direct Zustand store calls
- [ ] Remove `IssueDetail` class wrapper
- [ ] Test with Playwright MCP

### Wave 4: IssueRootStore Decomposition

- [ ] Ensure all sub-stores have hooks
- [ ] Replace all `rootStore.issue.xxx` patterns
- [ ] Remove `IssueRootStore` class
- [ ] Update `CoreRootStore` to remove issue store
- [ ] Test with Playwright MCP

### Wave 5: Cleanup

- [ ] Remove empty store files
- [ ] Update exports
- [ ] Final E2E test suite
- [ ] Update documentation

---

## Risk Mitigation

### Low Risk Migrations

- Filter stores (already have Zustand)
- Issue detail stores (already have Zustand)
- View state stores (isolated)

### Medium Risk Migrations

- Issue stores (complex pagination logic)
- Member stores (permission dependencies)

### High Risk Migrations

- IssueRootStore (coordinates everything)
- CoreRootStore (app-wide)

**Approach:** Test after EVERY component change. The E2E suite is comprehensive (211 tests).

---

## Success Metrics

- [ ] Zero `*StoreLegacy` classes (✅ Phase 1 complete)
- [ ] Zero class wrappers in `store/issue/` folder
- [ ] All filter access via reactive hooks
- [ ] All issue actions via `useIssuesActions`
- [ ] `rootStore.issue` removed from `CoreRootStore`
- [ ] 211/211 E2E tests passing
- [ ] Visual verification of all major pages

---

## Next Steps

**Wave 1 is complete!** Next:

1. Start **Wave 2**: Add `useIssuePaginationData()` and `useIssueViewFlags()` hooks
2. Update components that access `issues.getPaginationData()` and `issues.viewFlags`
3. Consider Wave 3 in parallel since Issue Detail stores are already Zustand

# Sprint Visibility & Workflow Improvements Plan

## Overview

Refactor sprint visibility to use Resources sheet (SprintMemberProject) as the source of truth, with proper handling of edge cases when assignments change.

## Core Principles

1. **Resources = Source of Truth**: A sprint only appears in a project view when someone is assigned to that project for that sprint via SprintMemberProject
2. **Multiple Members Per Sprint-Project**: Support multiple people working on the same project in the same sprint
3. **Graceful Degradation**: Show warning for orphaned issues (SprintIssues without SprintMemberProject)
4. **Historical Immutability**: Completed sprints are read-only
5. **Backlog Discipline**: Unassigned future work stays in backlog, not sprints

---

## Implementation Tasks

### Phase 1: Backend API Changes

#### 1.1 Update ProjectSprintEndpoint to use SprintMemberProject only

**File**: `apps/api/plane/app/views/workspace/sprint.py`

Current behavior returns UNION of SprintMemberProject and SprintIssue. Change to:

- Primary: Return sprints where SprintMemberProject exists
- Secondary: Flag sprints that have SprintIssues but no SprintMemberProject (orphaned)

```python
# Response shape
{
  "sprint_ids": ["uuid1", "uuid2"],  # Sprints with assignments
  "orphaned_sprint_ids": ["uuid3"]   # Sprints with issues but no assignments (warning)
}
```

#### 1.2 Add endpoint to check orphaned issues before removing assignment

**File**: `apps/api/plane/app/views/workspace/sprint.py`

New endpoint: `GET /api/workspaces/{slug}/sprint-member-projects/{id}/removal-impact/`

Returns:

```python
{
  "is_last_member": true,  # Is this the last person assigned?
  "orphaned_issue_count": 15,  # How many issues would become orphaned?
  "next_sprint": {  # If a following sprint exists for this project
    "id": "uuid",
    "name": "Sprint 11",
    "start_date": "2025-01-05"
  }
}
```

#### 1.3 Add bulk move issues endpoint

**File**: `apps/api/plane/app/views/workspace/sprint.py`

New endpoint: `POST /api/workspaces/{slug}/sprints/{sprint_id}/bulk-move-issues/`

Request:

```python
{
  "issue_ids": ["uuid1", "uuid2"],  # Issues to move (or "all" for all in sprint)
  "target_sprint_id": "uuid",  # Destination sprint (null = unassign/backlog)
  "project_id": "uuid"  # Filter to specific project
}
```

#### 1.4 Add read-only check for completed sprints

**File**: `apps/api/plane/app/views/workspace/sprint.py`

Modify SprintMemberProject create/update/delete to reject changes for completed sprints (end_date < today).

---

### Phase 2: Frontend Query Updates

#### 2.1 Update useProjectSprints to handle orphaned sprints

**File**: `apps/web/core/store/queries/sprint.ts`

Update to use new response shape with `orphaned_sprint_ids`.

#### 2.2 Update SprintService with new endpoints

**File**: `apps/web/core/services/sprint.service.ts`

Add:

- `checkRemovalImpact(workspaceSlug, sprintMemberProjectId)`
- `bulkMoveIssues(workspaceSlug, sprintId, issueIds, targetSprintId, projectId)`

#### 2.3 Update types

**File**: `packages/types/src/sprint/sprint.ts`

Add:

```typescript
export type TProjectSprintsResponse = {
  sprint_ids: string[];
  orphaned_sprint_ids: string[];
};

export type TRemovalImpact = {
  is_last_member: boolean;
  orphaned_issue_count: number;
  next_sprint: { id: string; name: string; start_date: string } | null;
};

export type TBulkMoveIssuesRequest = {
  issue_ids: string[] | "all";
  target_sprint_id: string | null;
  project_id: string;
};
```

---

### Phase 3: UI Components

#### 3.1 Warning badge for orphaned sprints

**File**: `apps/web/core/components/sprints/list/sprint-list-item.tsx`

Show warning icon + message when sprint has issues but no assignments.

#### 3.2 Removal confirmation modal

**File**: `apps/web/core/components/sprints/sprint-removal-modal.tsx` (new)

When removing last member from a sprint-project:

1. Show count of orphaned issues
2. Options:
   - "Move issues to [next sprint dropdown]" (if next sprint exists)
   - "Return issues to backlog"
   - "Cancel"

#### 3.3 Bulk move issues action

**File**: `apps/web/core/components/sprints/bulk-move-modal.tsx` (new)

Multi-select issues → "Move to Sprint" → Select target sprint → Confirm

#### 3.4 Read-only state for completed sprints

**File**: `apps/web/core/components/sprints/list/sprint-list-item-action.tsx`

Disable edit/delete actions for completed sprints. Show "Completed" badge.

---

### Phase 4: Resources View Integration

#### 4.1 Update Resources assignment removal flow

**File**: `apps/web/ce/components/resource-view/` (find exact file)

When clicking to remove an assignment:

1. Call `checkRemovalImpact` endpoint
2. If `is_last_member` && `orphaned_issue_count > 0`, show removal modal
3. Otherwise, proceed with removal

---

## Testing Plan (Playwright MCP)

### Test 1: Basic Visibility

1. Navigate to Resources view
2. Assign Chris to Mobile App for Sprint 10
3. Navigate to Mobile App → Sprints
4. Verify Sprint 10 appears in list
5. Remove Chris from Sprint 10 in Resources
6. Verify Sprint 10 no longer appears in Mobile App sprints (if no issues)

### Test 2: Multiple Members

1. Assign Chris to Mobile App for Sprint 10
2. Assign Lisa to Mobile App for Sprint 10
3. Navigate to Mobile App → Sprints
4. Verify Sprint 10 shows both assignees
5. Remove Chris - verify Sprint 10 still visible (Lisa still assigned)
6. Remove Lisa - verify removal warning if issues exist

### Test 3: Orphaned Issues Warning

1. Assign Chris to Mobile App for Sprint 10
2. Add 3 issues to Sprint 10 for Mobile App
3. Remove Chris via Resources
4. Verify warning modal appears with issue count
5. Choose "Return to backlog"
6. Verify issues no longer have sprint assignment
7. Verify Sprint 10 no longer appears in Mobile App sprints

### Test 4: Bulk Move Issues

1. Create Sprint 10 and Sprint 11 for Mobile App
2. Add 5 issues to Sprint 10
3. Multi-select 3 issues
4. Click "Move to Sprint"
5. Select Sprint 11
6. Verify 3 issues now in Sprint 11, 2 remain in Sprint 10

### Test 5: Completed Sprint Read-Only

1. Find a completed sprint (end_date in past)
2. Try to add assignment via Resources
3. Verify action is blocked/disabled
4. Verify "Completed" badge appears

### Test 6: Move to Next Sprint on Removal

1. Assign Chris to Mobile App for Sprint 10 and Sprint 11
2. Add 5 issues to Sprint 10
3. Remove Chris from Sprint 10
4. Warning modal should offer "Move to Sprint 11"
5. Choose "Move to Sprint 11"
6. Verify issues now in Sprint 11
7. Verify Sprint 10 no longer in Mobile App sprints

---

## Seed Data Updates

### Current State Analysis

**Issues**: Issues exist in sprints 1-8 across 4 projects
**SprintMemberProject**: Assignments only exist for sprints 1-4 (team_members 1-10, rotating across projects)

**Gap**: Sprints 5-8 have issues but NO SprintMemberProject assignments - under the new model, these would show as orphaned.

### Required Changes

#### 1. Extend sprint_member_projects.json

Add assignments for sprints 5-8 to ensure every issue's sprint has at least one person assigned to that project:

| Sprint | Project 1 (Onboarding) | Project 2 (Infrastructure) | Project 3 (Portal) | Project 4 (Mobile) |
| ------ | ---------------------- | -------------------------- | ------------------ | ------------------ |
| 5      | -                      | 2 issues                   | 2 issues           | 2 issues           |
| 6      | -                      | 1 issue                    | 1 issue            | 1 issue            |
| 7      | -                      | 2 issues                   | 1 issue            | 2 issues           |
| 8      | -                      | -                          | 1 issue            | 1 issue            |

For each project-sprint combo with issues, add at least one SprintMemberProject.

#### 2. Match issue sprint_id to SprintMemberProject

Principle: **Every issue with a sprint_id must have a corresponding SprintMemberProject for that project+sprint**

Assignments to add:

```json
// Sprint 5
{ "team_member_id": 1, "sprint_id": 5, "project_id": 2 },
{ "team_member_id": 2, "sprint_id": 5, "project_id": 2 },
{ "team_member_id": 3, "sprint_id": 5, "project_id": 3 },
{ "team_member_id": 4, "sprint_id": 5, "project_id": 3 },
{ "team_member_id": 5, "sprint_id": 5, "project_id": 4 },
{ "team_member_id": 6, "sprint_id": 5, "project_id": 4 },

// Sprint 6
{ "team_member_id": 7, "sprint_id": 6, "project_id": 2 },
{ "team_member_id": 8, "sprint_id": 6, "project_id": 3 },
{ "team_member_id": 9, "sprint_id": 6, "project_id": 4 },

// Sprint 7 (current sprint - Dec 22 - Jan 4)
{ "team_member_id": 10, "sprint_id": 7, "project_id": 2 },
{ "team_member_id": 1, "sprint_id": 7, "project_id": 2 },
{ "team_member_id": 2, "sprint_id": 7, "project_id": 3 },
{ "team_member_id": 3, "sprint_id": 7, "project_id": 4 },
{ "team_member_id": 4, "sprint_id": 7, "project_id": 4 },

// Sprint 8 (upcoming)
{ "team_member_id": 5, "sprint_id": 8, "project_id": 3 },
{ "team_member_id": 6, "sprint_id": 8, "project_id": 4 }
```

#### 3. Intentional Orphan Test Case (Optional)

For testing the warning UX, consider leaving ONE issue orphaned:

- Issue 33 is in Sprint 8, Project 3 (Customer Portal)
- Add SprintMemberProject for Sprint 8, Project 4 (Mobile) only
- This creates an orphan case for Portal Sprint 8

---

## Migration Notes

- No data migration needed - existing SprintIssues will show as "orphaned" warnings
- Users can resolve orphaned issues by either:
  - Assigning someone to that sprint-project
  - Moving issues to another sprint
  - Returning issues to backlog

---

## Files to Modify

| File                                                                | Changes                                         |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| **Backend**                                                         |                                                 |
| `apps/api/plane/app/views/workspace/sprint.py`                      | Update ProjectSprintEndpoint, add new endpoints |
| `apps/api/plane/app/urls/sprint.py`                                 | Add new URL routes                              |
| **Frontend Services & Types**                                       |                                                 |
| `apps/web/core/services/sprint.service.ts`                          | Add new service methods                         |
| `apps/web/core/store/queries/sprint.ts`                             | Update hooks for new response shape             |
| `packages/types/src/sprint/sprint.ts`                               | Add new types                                   |
| **Frontend Components**                                             |                                                 |
| `apps/web/core/components/sprints/list/sprint-list-item.tsx`        | Orphaned warning badge                          |
| `apps/web/core/components/sprints/sprint-removal-modal.tsx`         | New modal component                             |
| `apps/web/core/components/sprints/bulk-move-modal.tsx`              | New modal component                             |
| `apps/web/core/components/sprints/list/sprint-list-item-action.tsx` | Read-only state                                 |
| `apps/web/ce/components/resource-view/*.tsx`                        | Integrate removal flow                          |
| **Seed Data**                                                       |                                                 |
| `apps/api/plane/seeds/data/sprint_member_projects.json`             | Add assignments for sprints 5-8                 |
| `apps/api/plane/db/management/commands/seed_data.py`                | No changes needed (already handles SMP)         |

---

## Acceptance Criteria

- [ ] Sprints only appear in project view when SprintMemberProject exists
- [ ] Orphaned sprints (issues but no assignment) show warning badge
- [ ] Removing last member shows confirmation with options
- [ ] Bulk move issues between sprints works
- [ ] Completed sprints are read-only
- [ ] All 6 Playwright tests pass

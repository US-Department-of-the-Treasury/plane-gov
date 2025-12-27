# Sprint-Project Relationship Model

## Overview

This document describes how sprints, projects, and resources relate to each other in Plane Gov.

## Core Principle

**Sprints are workspace-wide, fixed 2-week periods.** Projects don't "have" sprints - instead, resources (people) are assigned to work on projects during sprint periods.

## Data Models

### Sprint

Workspace-wide time period. All sprints are 14 days, auto-generated based on workspace settings.

```
Sprint
├── workspace (FK)
├── number (sequential)
├── name ("Sprint 1", "Sprint 2", etc.)
├── start_date
└── end_date (always start_date + 13 days)
```

### SprintMemberProject (Primary Relationship)

**"Who is working on which project during which sprint"**

This is the SOURCE OF TRUTH for project-sprint relationships. A project "participates" in a sprint when at least one person is assigned to work on it.

```
SprintMemberProject
├── sprint (FK)
├── member (FK → WorkspaceMember)
└── project (FK)
```

### SprintIssue (Work Items)

**"Which issues are in which sprint"**

Links individual work items to sprints. Can exist independently of SprintMemberProject (for planning ahead).

```
SprintIssue
├── sprint (FK)
├── issue (FK)
└── workspace (FK, derived from sprint)
```

## Derived Relationships

### "Which sprints appear in a project's sprint list?"

A sprint appears in a project's view if ANY of these are true:

1. **SprintMemberProject exists**: Someone is assigned to this project for this sprint
2. **SprintIssue exists**: Work items from this project are in this sprint

```sql
-- Pseudocode for project sprint list
SELECT DISTINCT sprint FROM (
    SELECT sprint_id FROM sprint_member_projects WHERE project_id = ?
    UNION
    SELECT sprint_id FROM sprint_issues
    JOIN issues ON issues.id = sprint_issues.issue_id
    WHERE issues.project_id = ?
)
```

### "Is there an active sprint for this project?"

Active sprint = sprint where `start_date <= NOW <= end_date` AND (SprintMemberProject OR SprintIssue exists for this project)

## User Workflows

### From Project → Sprints View: "Assign Sprint"

When a user clicks "Assign Sprint" from a project's sprint page:

1. **Select Sprint**: Show upcoming/current sprints not yet associated with this project
2. **Select Resource(s)**: Choose who will work on this project during that sprint
3. **Show Capacity**: For each potential assignee, show their current allocations
4. **Create**: Creates `SprintMemberProject` record(s)

This is equivalent to going to Resources view and assigning the person to the project.

### From Resources View: "Assign Project"

When a user assigns someone to a project from the Resources matrix:

1. Click on a cell (person × sprint)
2. Select project
3. Creates `SprintMemberProject` record

### Adding Work Items to Sprint

Work items can be added to sprints independently:

1. From issue detail: Set sprint field
2. From sprint view: Drag issue into sprint
3. Creates `SprintIssue` record

**Note**: Work items can be added to a sprint even if no one is assigned to the project yet (planning ahead scenario).

## Display Logic

### Project Sprint List

```
┌─────────────────────────────────────────────────────────────┐
│ Active Sprint                                               │
├─────────────────────────────────────────────────────────────┤
│ [If SprintMemberProject exists for current sprint]          │
│   Sprint 7 (Dec 22 - Jan 4)                                 │
│   Assignees: Chris Brown, Lisa Nguyen                       │
│   Work Items: 5 issues                                      │
│                                                             │
│ [Else if SprintIssue exists but no SprintMemberProject]     │
│   Sprint 7 (Dec 22 - Jan 4)                                 │
│   ⚠️ No one assigned - 3 work items need an owner           │
│                                                             │
│ [Else - no active sprint]                                   │
│   No active sprint for this project                         │
│   [Assign Sprint] button                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Upcoming Sprints (3)                                        │
├─────────────────────────────────────────────────────────────┤
│ Sprint 8 (Jan 5-18) - Lisa Nguyen - 2 issues               │
│ Sprint 9 (Jan 19-Feb 1) - Unassigned - 0 issues            │
│ Sprint 10 (Feb 2-15) - Chris, Bob - 4 issues               │
└─────────────────────────────────────────────────────────────┘
```

## Capacity Model

**One project per sprint per person.** This is an intentional constraint to keep planning simple.

- Each team member can only be assigned to ONE project during a sprint
- If someone is already assigned elsewhere, they show as "unavailable"
- No percentage splits, no multi-project assignments
- This forces explicit prioritization decisions

### Rationale

Flexibility leads to chaos. If people can be "50% on Project A, 50% on Project B", then:

- No one is accountable for either project
- Context switching kills productivity
- Sprint planning becomes a negotiation instead of a decision

By enforcing exclusivity, we force teams to answer: "What is this person's ONE priority for the next two weeks?"

### UI Implications

In the "Assign Sprint" modal:

```
Select team member for Sprint 10:

◉ Lisa Nguyen
  └─ Available

○ Chris Brown (unavailable)
  └─ Assigned to: Mobile App

○ Robert Garcia (unavailable)
  └─ Assigned to: Infrastructure
```

Unavailable members are shown but disabled, with clear indication of their current assignment.

## Edge Cases

### Sprint with issues but no assignees

- Shows in project sprint list
- Warning indicator: "No one assigned"
- Work items are listed but may need an owner

### Removing last assignee

- Sprint remains visible if SprintIssues exist
- Only completely disappears when both SprintMemberProject AND SprintIssue are empty

### Historical (completed) sprints

- Always show in project view if they had assignees or issues
- Read-only, cannot modify assignments

### Planning ahead (issues without assignees)

- Valid use case: "We know this work needs to happen in Sprint 15, but don't know who yet"
- Bob might be assigned as lead, but team members TBD
- Issues can be pre-populated for planning

## Migration Notes

### Deprecated: ProjectSprint Model

The `ProjectSprint` model (if it exists) should be removed. Project-sprint relationships are now derived from:

- `SprintMemberProject` (primary)
- `SprintIssue` (secondary)

### Data Migration

If ProjectSprint records exist without corresponding SprintMemberProject:

1. Check if SprintIssues exist → keep sprint visible via that relationship
2. If no SprintIssues either → sprint was assigned but never used, can be dropped

## Frontend Implementation

### Query Hooks (TanStack Query)

Located in `apps/web/core/store/queries/sprint.ts`:

#### `useProjectSprints(workspaceSlug, projectId)`

Fetches sprints filtered by project association. Combines:

1. `getWorkspaceSprints()` - all workspace sprints
2. `getProjectSprints()` - sprint IDs associated with this project

Returns only sprints where the project participates via SprintMemberProject OR SprintIssue.

#### `useActiveSprint(workspaceSlug, projectId)`

Returns project-filtered sprints so `getActiveSprint()` can find the current one.

**Important**: This hook fetches the same data as `useProjectSprints` because the "active" sprint must also be one that the project participates in. A sprint is only "active" for a project if:

1. Current date is within sprint dates (start_date <= now <= end_date)
2. AND the project is associated with the sprint

#### `getActiveSprint(sprints)`

Pure function that finds the sprint where current date falls within date range.

### API Endpoints

| Endpoint                                              | Purpose                        |
| ----------------------------------------------------- | ------------------------------ |
| `GET /api/workspaces/{slug}/sprints/`                 | All workspace sprints          |
| `GET /api/workspaces/{slug}/projects/{id}/sprints/`   | Sprint IDs for a project       |
| `GET /api/workspaces/{slug}/sprint-member-projects/`  | All member-project assignments |
| `POST /api/workspaces/{slug}/sprint-member-projects/` | Create/update assignment       |

### Components

| Component          | Location                                       | Purpose                       |
| ------------------ | ---------------------------------------------- | ----------------------------- |
| `ActiveSprintRoot` | `ce/components/sprints/active-sprint/root.tsx` | Renders active sprint section |
| `SprintsList`      | `core/components/sprints/list/root.tsx`        | Main sprints list view        |
| `SprintsView`      | `core/components/sprints/sprints-view.tsx`     | Sprints page with filtering   |

### Data Flow

```
Resources Page                           Project Sprints Page
     │                                          │
     ▼                                          ▼
SprintMemberProject  ◄─────────────────► useProjectSprints()
(stores assignment)                             │
                                               ▼
                              Filter workspace sprints by project
                                               │
                                               ▼
                              getActiveSprint() finds current sprint
                                               │
                                               ▼
                              ActiveSprintRoot renders sprint details
```

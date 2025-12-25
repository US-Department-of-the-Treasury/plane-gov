# Resource View - Sprint Assignment Matrix

A team resource management view that displays workspace members across sprints with project assignment capabilities.

## Purpose

This feature enables HR/resource managers to:

- View all team members in a matrix layout against sprint timelines
- Assign each team member to a project for each sprint
- Track which projects team members are working on across sprint cycles

## Architecture

```
resource-view/
├── index.ts                    # Public exports
├── root.tsx                    # Main wrapper component
├── resource-matrix.tsx         # Matrix grid layout (members × sprints)
├── sprint-project-cell.tsx     # Individual cell with project combobox
├── use-sprint-assignments.ts   # localStorage persistence hook
└── README.md                   # This file
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ResourceMatrix                            │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │ useWorkspace     │  │ useSprintProjectAssignments          │ │
│  │ Members()        │  │ (localStorage hook)                  │ │
│  │ useWorkspace     │  │                                      │ │
│  │ Sprints()        │  │ Key: plane_sprint_assignments_{slug} │ │
│  └──────────────────┘  │ Value: { "memberId-sprintId": "pid" }│ │
│                        └──────────────────────────────────────┘ │
│                                       │                         │
│  For each member × sprint:            │                         │
│  ┌───────────────────────────────────▼────────────────────────┐│
│  │              SprintProjectCell                             ││
│  │  - Renders SelectCombobox with workspace projects          ││
│  │  - Shows project logo + name when assigned                 ││
│  │  - Calls onAssignmentChange → setAssignment                ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Frontend-Only Persistence (localStorage)

Assignments are stored in localStorage, not the backend API. This was intentional for:

- Rapid prototyping without backend changes
- Workspace-scoped isolation (`plane_sprint_assignments_{workspaceSlug}`)
- Easy clearing/reset for testing

**Future enhancement:** Migrate to API persistence when the feature is validated.

### Single Project Per Sprint Cell

Each team member can be assigned to exactly ONE project per sprint. This reflects the typical "dedicated team member" allocation model rather than fractional allocation.

### Member Data Structure

The `IWorkspaceMember` type has a nested structure:

```typescript
interface IWorkspaceMember {
  id: string; // membership ID
  member: IUserLite; // nested user object with display_name, email, avatar
  role: number;
}
```

Access user properties via `member.member?.display_name`, not `member.display_name`.

## Related Components

- **Sidebar:** `apps/web/app/(all)/[workspaceSlug]/(resources)/_sidebar.tsx`
  - HR-focused filters (All Team Members, Assigned, Unassigned, Current Sprint)
  - Uses Users icon instead of file-related icons

## Hooks Used

| Hook                          | Source                     | Purpose                         |
| ----------------------------- | -------------------------- | ------------------------------- |
| `useWorkspaceMembers`         | `@/store/queries/member`   | Fetch workspace members         |
| `useWorkspaceSprints`         | `@/store/queries/sprint`   | Fetch sprint timeline           |
| `useProjects`                 | `@/store/queries/project`  | Fetch project list for combobox |
| `useSprintProjectAssignments` | `./use-sprint-assignments` | localStorage CRUD               |

## Testing

Seed data includes:

- Multiple workspace members with display names
- 4 sprints (2 past, 1 current, 1 future)
- 4 projects for assignment options

Run `./scripts/db-reset.sh` to reset with test data, then navigate to the Resources view.

# Virtual Sprints Validation Plan

This document outlines the comprehensive testing strategy for the virtual sprints feature.

## Overview

Virtual sprints are frontend-calculated sprints that display ~1 year into the future. They are "lazy materialized" - created in the database only when a team member is assigned to them.

## Test Scenarios

### 1. Virtual Sprint Display

**Objective**: Verify virtual sprints appear correctly in the Resources page.

| Test Case                                      | Expected Behavior                                              | Validation Method                                |
| ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| 1.1 Virtual sprints appear in Resources matrix | ~27 virtual sprints (1 year) displayed after real sprints      | Navigate to Resources page, count sprint columns |
| 1.2 Virtual sprint headers show correct dates  | Each 14-day period calculated from workspace sprint_start_date | Check header text matches expected date ranges   |
| 1.3 Virtual sprints have distinct styling      | Dashed border, muted text color                                | Visual inspection                                |
| 1.4 Real sprints remain unchanged              | No changes to existing sprint display                          | Verify real sprint styling intact                |

### 2. Assignment to Virtual Sprint

**Objective**: Verify assigning a team member to a virtual sprint works correctly.

| Test Case                             | Expected Behavior                                           | Validation Method                 |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| 2.1 Click on virtual sprint cell      | Project dropdown appears                                    | Click cell, verify dropdown       |
| 2.2 Select project for virtual sprint | Sprint materializes, assignment created                     | Verify API call, check database   |
| 2.3 UI updates after assignment       | Cell shows project, sprint header styling changes to "real" | Visual inspection                 |
| 2.4 Assignment persists after refresh | Assignment still visible                                    | Refresh page, verify assignment   |
| 2.5 Sprint appears in project view    | Newly materialized sprint visible in project's sprint list  | Navigate to project's sprint view |

### 3. Cache Invalidation

**Objective**: Verify data updates correctly without page refresh.

| Test Case                                        | Expected Behavior                                | Validation Method                    |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------ |
| 3.1 Virtual sprint assignment via SPA navigation | Assignment visible immediately                   | Assign, navigate via sidebar, verify |
| 3.2 Multiple assignments to same virtual sprint  | All assignments visible, only one sprint created | Assign multiple members, check DB    |
| 3.3 Workspace sprint list updated                | New sprint appears in workspace sprint list      | Check workspace sprints API          |

### 4. Edge Cases

**Objective**: Verify system handles edge cases gracefully.

| Test Case                                                | Expected Behavior                               | Validation Method                      |
| -------------------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| 4.1 Assign then unassign from virtual sprint             | Sprint remains materialized, assignment removed | Assign, unassign, verify sprint exists |
| 4.2 Race condition: two users assign same virtual sprint | Single sprint created, both assignments work    | Simulate concurrent requests           |
| 4.3 Network failure during materialization               | Error toast, no orphaned data                   | Disconnect network, attempt assign     |
| 4.4 Workspace without sprint_start_date                  | Virtual sprints still calculated from default   | Test workspace without date set        |

### 5. Performance

**Objective**: Verify performance with many sprint columns.

| Test Case                              | Expected Behavior         | Validation Method                   |
| -------------------------------------- | ------------------------- | ----------------------------------- |
| 5.1 Page load with ~30+ sprint columns | Page loads in <2 seconds  | Measure load time                   |
| 5.2 Horizontal scrolling performance   | Smooth scrolling, no jank | Scroll left/right, check smoothness |
| 5.3 Memory usage                       | No memory leaks           | Monitor browser DevTools            |

### 6. Integration with Existing Features

**Objective**: Verify virtual sprints work with existing sprint features.

| Test Case                                     | Expected Behavior                                                | Validation Method                          |
| --------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| 6.1 Sprint assignment modal from project view | Shows both real and virtual sprints                              | Open modal, verify list                    |
| 6.2 SprintAssignedMembers component           | Shows members correctly for virtual sprint after materialization | Check avatars display                      |
| 6.3 Project sprint filtering                  | Virtual sprints appear in correct section after materialization  | Navigate to project, check sprint sections |

## Playwright MCP Test Execution

### Test Sequence

1. **Setup**
   - Navigate to http://localhost:3020 (or current dev port)
   - Login as admin@admin.gov / admin123
   - Navigate to workspace

2. **Test 1.1-1.4: Virtual Sprint Display**

   ```
   1. Navigate to Resources page
   2. Take snapshot to verify virtual sprints appear
   3. Count sprint columns (expect > 10 after current sprint)
   4. Verify virtual sprint has different styling (dashed border)
   ```

3. **Test 2.1-2.5: Assignment to Virtual Sprint**

   ```
   1. Scroll right to find a virtual sprint
   2. Click on an empty cell for a team member
   3. Select a project from dropdown
   4. Verify:
      - Cell shows project name
      - Sprint column header styling changes
      - No loading spinners remain
   5. Navigate to project's sprint view via sidebar
   6. Verify sprint appears in Upcoming/Completed section
   ```

4. **Test 3.1: Cache Invalidation**

   ```
   1. From Resources page, make assignment
   2. Click on project in sidebar (SPA navigation)
   3. Navigate to Sprints tab
   4. Verify newly assigned sprint visible without refresh
   ```

5. **Test 4.1: Assign then Unassign**
   ```
   1. Assign to virtual sprint
   2. Note sprint number/name
   3. Remove assignment (select "Remove assignment")
   4. Verify cell is empty
   5. Click cell again, verify sprint dropdown shows the sprint still exists
   ```

## Manual Verification Checklist

- [ ] Virtual sprints display after real sprints in Resources matrix
- [ ] Virtual sprint columns have dashed border styling
- [ ] Clicking virtual sprint cell shows project dropdown
- [ ] Selecting project triggers materialization
- [ ] Assignment visible immediately (no refresh needed)
- [ ] Navigating to project shows sprint in sprint view
- [ ] Removing assignment works correctly
- [ ] Sprint remains after unassign (doesn't disappear)
- [ ] No errors in browser console
- [ ] API returns correct data after materialization

## API Endpoints to Verify

| Endpoint                                         | Method | Scenario                                 |
| ------------------------------------------------ | ------ | ---------------------------------------- |
| `/api/workspaces/{slug}/sprints/materialize/`    | POST   | Called when assigning to virtual sprint  |
| `/api/workspaces/{slug}/sprint-member-projects/` | POST   | Called to create assignment              |
| `/api/workspaces/{slug}/sprints/`                | GET    | Should include newly materialized sprint |
| `/api/workspaces/{slug}/projects/{id}/sprints/`  | GET    | Should include sprint after assignment   |

## Success Criteria

1. All virtual sprints display correctly for ~1 year into the future
2. Assignment to virtual sprint triggers materialization and creates record
3. Cache invalidation works for SPA navigation
4. No errors in console during normal usage
5. Performance acceptable with 30+ sprint columns

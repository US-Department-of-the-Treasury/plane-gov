# Using Plane: A Practical Guide

This guide explains how to use Plane for project management at Treasury, with real-world examples. We use industry-standard terminology: **Sprints** (time-boxed iterations) and **Epics** (large features).

---

## Core Concepts

### Hierarchy Overview

```
Workspace: Treasury
│
├── Initiative: FedRAMP Compliance (cross-project program)
│   ├── Epic (in Audit Tracker): Audit Logging
│   ├── Epic (in Audit Tracker): Access Controls
│   ├── Epic (in Benefits Portal): Session Management
│   └── Epic (in Infrastructure): Deploy WAF
│
├── Project: Audit Tracker (product/application)
│   ├── Epics (large features, 1-3 months)
│   │   └── Epic: User Management Overhaul
│   │       ├── Issue: Add role-based access
│   │       ├── Issue: Migrate legacy users
│   │       └── Issue: Add SSO support
│   ├── Sprints (2-week time boxes)
│   │   └── Sprint 23 (Jan 6-20)
│   │       ├── Issue from Epic above
│   │       └── Issue: Fix login bug
│   └── Inbox (incoming requests)
│
├── Project: Benefits Portal
│   └── ...
│
└── Project: Infrastructure
    └── ...
```

**Key insight:** Epics live in ONE project. Initiatives group Epics ACROSS projects.

### What Each Primitive Means

| Concept        | Scope                       | Duration         | Example                    |
| -------------- | --------------------------- | ---------------- | -------------------------- |
| **Workspace**  | Your organization           | Permanent        | "Treasury"                 |
| **Initiative** | Cross-project program       | 1-4 quarters     | "FedRAMP Compliance"       |
| **Project**    | A product or application    | Permanent        | "Audit Tracker"            |
| **Epic**       | Large feature (one project) | 1-3 months       | "User Management Overhaul" |
| **Sprint**     | Time-boxed work period      | 2 weeks          | "Sprint 23 (Jan 6-20)"     |
| **Issue**      | Individual work item        | Hours to 2 weeks | "Add PDF export"           |
| **Label**      | Cross-cutting category      | N/A              | `security`, `tech-debt`    |

---

## Workspaces

A Workspace is your top-level container. For Treasury, you'll have one workspace containing all your projects.

**When to create a new Workspace:** Almost never. Use one workspace for your entire organization. Multiple workspaces are only for completely separate organizations.

---

## Projects

A Project represents a **product, application, or major workstream** that has its own backlog and team.

### When to Create a Project

Create a separate Project when:

- It's a distinct product with its own users (Audit Tracker, Benefits Portal)
- It has its own release cycle
- It needs separate access controls
- It has its own ATO/compliance boundary

### Examples

| Project                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| Audit Tracker           | Internal tool for managing Treasury audits  |
| Benefits Portal         | Public-facing benefits application          |
| Shared Infrastructure   | Platform services (auth, monitoring, CI/CD) |
| Public Affairs Requests | Website updates, press materials            |

### Project Settings to Configure

1. **Features**: Enable/disable Sprints, Epics, Pages, Inbox
2. **States**: Customize workflow states (Backlog → Todo → In Progress → Done)
3. **Labels**: Create project-specific labels
4. **Members**: Add team members with appropriate roles

---

## Initiatives

Initiatives are **cross-project programs** that group related Epics from multiple projects. Think of them as "Epics of Epics" that span your entire organization.

**This is identical to Jira's "Initiative" (requires Jira Premium).**

### When to Use Initiatives

Use an Initiative when work spans multiple projects:

- Compliance programs (FedRAMP, FISMA, SOC 2)
- Platform migrations affecting all products
- Security hardening across applications
- Major organizational changes

### When NOT to Use Initiatives

Skip Initiatives when:

- Work lives entirely in one project → just use an Epic
- You're tracking a category, not a program → use Labels instead
- You have a small team with one product → Epics are enough

### Initiative vs Epic vs Label

| Use Case                           | Right Tool     | Example                                     |
| ---------------------------------- | -------------- | ------------------------------------------- |
| Large feature in one product       | **Epic**       | "User Management Overhaul" in Audit Tracker |
| Program spanning multiple products | **Initiative** | "FedRAMP Compliance" across all projects    |
| Category for filtering             | **Label**      | `security`, `tech-debt`, `public-affairs`   |

### How to Create an Initiative

1. Go to **Workspace** → **Initiatives**
2. Click **+ New Initiative**
3. Fill in:
   - **Name**: Clear program name (e.g., "FedRAMP Authorization")
   - **Description**: Goals, scope, success criteria
   - **Start/Target Date**: Program timeline
4. Link Epics from various projects to the Initiative

### Example: FedRAMP Compliance Initiative

```
Initiative: FedRAMP Authorization (Q1-Q2 2025)
│
├── Epic (Audit Tracker): Audit Logging
│   ├── Issue: Add login event logging
│   ├── Issue: Add data access logging
│   └── Issue: Create audit dashboard
│
├── Epic (Audit Tracker): Access Controls
│   ├── Issue: Implement RBAC
│   └── Issue: Add session timeout
│
├── Epic (Benefits Portal): Session Management
│   ├── Issue: Add idle timeout
│   └── Issue: Implement secure cookies
│
└── Epic (Infrastructure): Deploy WAF
    ├── Issue: Configure AWS WAF rules
    └── Issue: Set up monitoring alerts
```

The Initiative dashboard shows progress across ALL linked Epics, regardless of which project they're in.

---

## Epics

Epics are **large features or milestones** that take 1-3 months and span multiple sprints. They group related issues together.

### When to Create an Epic

- Feature too large for one sprint
- Logical grouping of related work
- Milestone or release target
- Migration or major refactor

### Examples

| Epic                         | Project         | Duration | Issues    |
| ---------------------------- | --------------- | -------- | --------- |
| User Management Overhaul     | Audit Tracker   | 6 weeks  | 12 issues |
| Mobile Responsive Redesign   | Benefits Portal | 8 weeks  | 18 issues |
| Database Migration to Aurora | Infrastructure  | 4 weeks  | 8 issues  |

### Epic Statuses

| Status          | Meaning                     |
| --------------- | --------------------------- |
| **Backlog**     | Planned but not started     |
| **Planned**     | Scheduled for upcoming work |
| **In Progress** | Actively being worked on    |
| **Paused**      | Temporarily on hold         |
| **Completed**   | All issues done             |
| **Cancelled**   | No longer pursuing          |

### How to Create an Epic

1. Go to your **Project** → **Epics**
2. Click **+ New Epic**
3. Fill in:
   - **Name**: Clear, descriptive (e.g., "Q1: User Management Overhaul")
   - **Description**: What problem this solves, acceptance criteria
   - **Lead**: Person responsible for the epic
   - **Start/Target Date**: Expected timeline
   - **Status**: Usually starts as "Backlog" or "Planned"

### Adding Issues to an Epic

When creating or editing an issue:

1. Find the **Epic** field
2. Select the relevant epic
3. The issue now appears in both the epic view and sprint board

**Note:** An issue can belong to **one Epic** and **one Sprint** simultaneously. This is correct—epics group by feature, sprints group by time.

---

## Sprints

Sprints are **time-boxed work periods**, typically 2 weeks. They answer: "What will we complete in the next two weeks?"

### Sprint Basics

- **Duration**: 2 weeks (Treasury standard)
- **Commitment**: Team commits to completing selected issues
- **Burndown**: Track progress daily
- **Demo**: Show completed work at sprint end

### Sprint Statuses

| Status        | Meaning                   |
| ------------- | ------------------------- |
| **Draft**     | Being planned, not active |
| **Upcoming**  | Scheduled to start soon   |
| **Current**   | Active sprint             |
| **Completed** | Sprint ended              |

### How to Create a Sprint

1. Go to your **Project** → **Sprints**
2. Click **+ New Sprint**
3. Fill in:
   - **Name**: "Sprint 23" or "Jan 6-20 Sprint"
   - **Start Date**: First day of sprint
   - **End Date**: Last day (typically 2 weeks later)
4. Add issues from the backlog

### Sprint Planning Workflow

**Before Sprint (Planning)**

1. Review backlog, ensure issues are estimated and prioritized
2. Create new sprint with dates
3. Drag issues from backlog into sprint
4. Team commits to sprint scope

**During Sprint**

1. Daily: Update issue statuses
2. Move issues through: Todo → In Progress → In Review → Done
3. Monitor burndown chart
4. Flag blockers early

**After Sprint (Review & Retro)**

1. Demo completed work
2. Incomplete issues auto-move to next sprint (or back to backlog)
3. Sprint marked as Completed
4. Run retrospective

### Sprint vs Epic: How They Interact

```
Epic: User Management Overhaul (6 weeks)
├── Sprint 23 (Jan 6-20)
│   ├── Issue: Design role system ✓
│   └── Issue: Create roles table ✓
├── Sprint 24 (Jan 20-Feb 3)
│   ├── Issue: Build role assignment UI
│   └── Issue: Add permission checks
└── Sprint 25 (Feb 3-17)
    ├── Issue: Write migration script
    └── Issue: User acceptance testing
```

Issues from multiple epics can be in the same sprint:

```
Sprint 24 (Jan 20-Feb 3)
├── From Epic "User Management": Build role UI
├── From Epic "User Management": Add permissions
├── From Epic "Performance": Optimize dashboard queries
└── Bug: Fix login timeout (no epic)
```

---

## Issues

Issues are **individual work items**: features, bugs, tasks, or support requests.

### Issue Types

Configure these in Project Settings → Issue Types:

| Type        | Icon | Use For                                     |
| ----------- | ---- | ------------------------------------------- |
| **Story**   | 📖   | User-facing feature ("As a user, I can...") |
| **Task**    | ✓    | Technical work, internal improvements       |
| **Bug**     | 🐛   | Defects, things that don't work correctly   |
| **Support** | 🎫   | User-reported issues, help requests         |

### Issue Fields

| Field           | Purpose                      | Example                          |
| --------------- | ---------------------------- | -------------------------------- |
| **Title**       | Brief description            | "Add PDF export to reports"      |
| **Description** | Details, acceptance criteria | Markdown with requirements       |
| **State**       | Workflow position            | Backlog, Todo, In Progress, Done |
| **Priority**    | Urgency                      | Urgent, High, Medium, Low, None  |
| **Assignee**    | Who's doing the work         | @jane.doe                        |
| **Sprint**      | Which sprint                 | Sprint 24                        |
| **Epic**        | Which feature group          | User Management                  |
| **Labels**      | Categories                   | `security`, `public-affairs`     |
| **Due Date**    | Deadline                     | Feb 15, 2025                     |
| **Estimate**    | Size/effort                  | Story points or time             |

### Writing Good Issue Titles

**Good:**

- "Add PDF export button to audit report page"
- "Fix: Users logged out after 5 minutes of inactivity"
- "Migrate user table from MySQL to PostgreSQL"

**Bad:**

- "PDF" (too vague)
- "Bug" (not descriptive)
- "John's task" (meaningless to others)

### Issue Workflow States

Default states (customize per project):

```
Backlog → Todo → In Progress → In Review → Done
                                    ↓
                                Cancelled
```

| State           | Meaning                               |
| --------------- | ------------------------------------- |
| **Backlog**     | Identified but not scheduled          |
| **Todo**        | Scheduled for current/upcoming sprint |
| **In Progress** | Actively being worked on              |
| **In Review**   | Code complete, awaiting review/QA     |
| **Done**        | Completed and verified                |
| **Cancelled**   | Won't do                              |

### Sub-Issues

Break large issues into smaller pieces:

```
Issue: Implement user role system
├── Sub-issue: Design database schema
├── Sub-issue: Create API endpoints
├── Sub-issue: Build admin UI
└── Sub-issue: Write tests
```

Create sub-issues by clicking **+ Add sub-issue** on any issue.

---

## Labels

Labels are **tags for categorizing and filtering** issues across any dimension.

### Recommended Label Categories

**Team/Requester:**

- `team:public-affairs`
- `team:security`
- `team:devops`

**Compliance:**

- `compliance:fedramp`
- `compliance:fisma`
- `compliance:privacy`

**Type (if not using issue types):**

- `type:tech-debt`
- `type:documentation`
- `type:infrastructure`

**Priority Override:**

- `critical` (for P0 issues)
- `blocked`
- `needs-discussion`

### How to Use Labels

1. **Create labels** in Project Settings → Labels
2. **Apply labels** when creating/editing issues
3. **Filter by labels** in board/list views
4. **Create saved views** with label filters

---

## Inbox (Intake)

The Inbox captures **incoming requests** before they're triaged into the backlog.

### When to Use Inbox

- Support requests from users
- Bug reports from stakeholders
- Feature requests from product team
- External requests (Public Affairs, Legal)

### Inbox Workflow

```
New Request → Inbox → Triage → Accept/Decline/Snooze
                                    ↓
                              Backlog (as Issue)
```

**Triage Actions:**
| Action | Result |
|--------|--------|
| **Accept** | Creates issue in backlog |
| **Decline** | Closes with reason |
| **Snooze** | Revisit later |
| **Duplicate** | Link to existing issue |

### Setting Up Inbox

1. Enable Inbox in **Project Settings** → **Features**
2. Share inbox email/form with stakeholders
3. Assign triage rotation to team members

---

## Putting It All Together: Example Workflow

### Scenario: Treasury needs FedRAMP compliance by Q2

**Step 1: Create the Initiative**

```
Initiative: FedRAMP Authorization
- Start: January 2025
- Target: June 2025
- Description: Achieve FedRAMP Moderate authorization for all Treasury applications
```

**Step 2: Create Epics in each project**

```
Project: Audit Tracker
├── Epic: Audit Logging (Jan-Feb)
├── Epic: Access Controls (Feb-Mar)
└── Epic: Data Encryption (Mar-Apr)

Project: Benefits Portal
├── Epic: Session Management (Jan-Feb)
└── Epic: Input Validation (Feb-Mar)

Project: Infrastructure
└── Epic: WAF and Security Monitoring (Jan-Mar)
```

**Step 3: Link Epics to the Initiative**

Edit each Epic and set its Initiative to "FedRAMP Authorization". Now the Initiative dashboard shows progress across all projects.

**Step 4: Break Epics into Issues**

```
Epic: Audit Logging
├── Issue: Define audit event schema
├── Issue: Implement login/logout logging
├── Issue: Implement data access logging
├── Issue: Create audit log viewer
├── Issue: Add log retention policy
└── Issue: Write audit documentation
```

**Step 5: Sprint Planning**

```
Sprint 23 (Jan 6-20)
├── Issue: Define audit event schema (from Audit Logging epic)
├── Issue: Implement login/logout logging (from Audit Logging epic)
├── Issue: Fix session timeout bug (Bug, no epic)
└── Issue: Update dependencies (Task, no epic)
```

**Step 6: Daily Work**

- Pick issue from "Todo"
- Move to "In Progress"
- Create PR, get review
- Move to "Done"
- Pick next issue

**Step 7: Sprint Review**

- Demo completed work
- Incomplete issues move to Sprint 24
- Check Epic progress (% complete)
- Check Initiative dashboard for overall FedRAMP progress across all projects

---

## Quick Reference

### Daily Standup Questions

1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers?

### Issue Checklist Before Starting Work

- [ ] Clear acceptance criteria?
- [ ] Assigned to me?
- [ ] In current sprint?
- [ ] Dependencies resolved?
- [ ] Estimated?

### Sprint Planning Checklist

- [ ] Backlog groomed and prioritized
- [ ] Issues estimated
- [ ] Team capacity known
- [ ] Sprint goal defined
- [ ] Issues assigned to sprint

### Definition of Done

- [ ] Code complete and reviewed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner approved

### Keyboard Shortcuts

Navigate faster with these workspace mode shortcuts:

| Shortcut         | Action                   |
| ---------------- | ------------------------ |
| **Cmd/Ctrl + 1** | Switch to Projects mode  |
| **Cmd/Ctrl + 2** | Switch to Wiki mode      |
| **Cmd/Ctrl + 3** | Switch to Resources mode |

**Tip:** Plane remembers your last visited page in each mode. Switching back takes you exactly where you left off.

---

## Common Questions

**Q: Should I put a bug in an Epic?**
A: Only if it's directly related to that feature. Random bugs don't need an epic.

**Q: What if work spans two sprints?**
A: Break it into smaller issues. Each issue should be completable in one sprint.

**Q: How do I handle urgent requests mid-sprint?**
A: Add to current sprint if critical. Something else may need to move out. Flag in standup.

**Q: Epic or Sprint—which do I assign first?**
A: Epic first (what feature), then Sprint (when). An issue needs both to be fully planned.

**Q: How many issues per sprint?**
A: Depends on team size and velocity. Start with 5-8 per developer, adjust based on experience.

---

## Getting Help

- **Plane Documentation**: Available in the app under Help
- **Team Lead**: For process questions
- **#plane-support**: Slack channel for tool issues

import { index, layout, route } from "@react-router/dev/routes";
import type { RouteConfig, RouteConfigEntry } from "@react-router/dev/routes";

/**
 * ROUTE REGISTRATION - IMPORTANT!
 *
 * This project uses React Router with @react-router/dev (NOT standard Next.js App Router).
 * Every page must be explicitly registered here to be accessible.
 *
 * If you add a new feature with pages:
 * 1. Create the page files in app/(all)/[workspaceSlug]/(projects)/your-feature/
 * 2. Register routes HERE - pages won't work without registration!
 *
 * Route Pattern Examples:
 * - Simple page:    route(":workspaceSlug/feature", "./(all)/[workspaceSlug]/(projects)/feature/page.tsx")
 * - With layout:    layout("./(all)/[workspaceSlug]/(projects)/feature/layout.tsx", [
 *                     route(":workspaceSlug/feature", "./(all)/[workspaceSlug]/(projects)/feature/page.tsx"),
 *                   ])
 * - With params:    route(":workspaceSlug/feature/:id", "./(all)/[workspaceSlug]/(projects)/feature/[id]/page.tsx")
 *
 * Note: Route groups with () like (list) or (detail) organize files but don't affect URLs.
 *       The URL comes from the first argument to route().
 *
 * Symptom if you forget: 404 error when navigating to the new feature.
 */
export const coreRoutes: RouteConfigEntry[] = [
  // ========================================================================
  // USER MANAGEMENT ROUTES
  // ========================================================================

  // Home - Sign In
  layout("./(home)/layout.tsx", [index("./(home)/page.tsx")]),

  // Sign Up
  layout("./(all)/sign-up/layout.tsx", [route("sign-up", "./(all)/sign-up/page.tsx")]),

  // Account Routes - Password Management
  layout("./(all)/accounts/forgot-password/layout.tsx", [
    route("accounts/forgot-password", "./(all)/accounts/forgot-password/page.tsx"),
  ]),
  layout("./(all)/accounts/reset-password/layout.tsx", [
    route("accounts/reset-password", "./(all)/accounts/reset-password/page.tsx"),
  ]),
  layout("./(all)/accounts/set-password/layout.tsx", [
    route("accounts/set-password", "./(all)/accounts/set-password/page.tsx"),
  ]),

  // Create Workspace
  layout("./(all)/create-workspace/layout.tsx", [route("create-workspace", "./(all)/create-workspace/page.tsx")]),

  // Onboarding
  layout("./(all)/onboarding/layout.tsx", [route("onboarding", "./(all)/onboarding/page.tsx")]),

  // Invitations
  layout("./(all)/invitations/layout.tsx", [route("invitations", "./(all)/invitations/page.tsx")]),

  // Workspace Invitations
  layout("./(all)/workspace-invitations/layout.tsx", [
    route("workspace-invitations", "./(all)/workspace-invitations/page.tsx"),
  ]),

  // ========================================================================
  // ALL APP ROUTES
  // ========================================================================
  layout("./(all)/layout.tsx", [
    // ======================================================================
    // WORKSPACE-SCOPED ROUTES
    // ======================================================================
    layout("./(all)/[workspaceSlug]/layout.tsx", [
      // ====================================================================
      // PROJECTS APP SECTION - WORKSPACE LEVEL ROUTES
      // ====================================================================
      layout("./(all)/[workspaceSlug]/(projects)/layout.tsx", [
        // --------------------------------------------------------------------
        // WORKSPACE LEVEL ROUTES
        // --------------------------------------------------------------------

        // Workspace Home
        route(":workspaceSlug", "./(all)/[workspaceSlug]/(projects)/page.tsx"),

        // Active Sprints
        layout("./(all)/[workspaceSlug]/(projects)/active-sprints/layout.tsx", [
          route(":workspaceSlug/active-sprints", "./(all)/[workspaceSlug]/(projects)/active-sprints/page.tsx"),
        ]),

        // Resource View
        layout("./(all)/[workspaceSlug]/(projects)/resource-view/layout.tsx", [
          route(":workspaceSlug/resource-view", "./(all)/[workspaceSlug]/(projects)/resource-view/page.tsx"),
        ]),

        // Analytics
        layout("./(all)/[workspaceSlug]/(projects)/analytics/[tabId]/layout.tsx", [
          route(":workspaceSlug/analytics/:tabId", "./(all)/[workspaceSlug]/(projects)/analytics/[tabId]/page.tsx"),
        ]),

        // Browse
        layout("./(all)/[workspaceSlug]/(projects)/browse/[workItem]/layout.tsx", [
          route(":workspaceSlug/browse/:workItem", "./(all)/[workspaceSlug]/(projects)/browse/[workItem]/page.tsx"),
        ]),

        // Drafts
        layout("./(all)/[workspaceSlug]/(projects)/drafts/layout.tsx", [
          route(":workspaceSlug/drafts", "./(all)/[workspaceSlug]/(projects)/drafts/page.tsx"),
        ]),

        // Notifications
        layout("./(all)/[workspaceSlug]/(projects)/notifications/layout.tsx", [
          route(":workspaceSlug/notifications", "./(all)/[workspaceSlug]/(projects)/notifications/page.tsx"),
        ]),

        // Profile
        layout("./(all)/[workspaceSlug]/(projects)/profile/[userId]/layout.tsx", [
          route(":workspaceSlug/profile/:userId", "./(all)/[workspaceSlug]/(projects)/profile/[userId]/page.tsx"),
          route(
            ":workspaceSlug/profile/:userId/:profileViewId",
            "./(all)/[workspaceSlug]/(projects)/profile/[userId]/[profileViewId]/page.tsx"
          ),
          route(
            ":workspaceSlug/profile/:userId/activity",
            "./(all)/[workspaceSlug]/(projects)/profile/[userId]/activity/page.tsx"
          ),
        ]),

        // NOTE: Wiki routes have moved to (wiki) route group - see below

        // Workspace Views
        layout("./(all)/[workspaceSlug]/(projects)/workspace-views/layout.tsx", [
          route(":workspaceSlug/workspace-views", "./(all)/[workspaceSlug]/(projects)/workspace-views/page.tsx"),
          route(
            ":workspaceSlug/workspace-views/:globalViewId",
            "./(all)/[workspaceSlug]/(projects)/workspace-views/[globalViewId]/page.tsx"
          ),
        ]),

        // Archived Projects
        layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/archives/layout.tsx", [
          route(
            ":workspaceSlug/projects/archives",
            "./(all)/[workspaceSlug]/(projects)/projects/(detail)/archives/page.tsx"
          ),
        ]),

        // --------------------------------------------------------------------
        // PROJECT LEVEL ROUTES
        // --------------------------------------------------------------------

        // Project List
        layout("./(all)/[workspaceSlug]/(projects)/projects/(list)/layout.tsx", [
          route(":workspaceSlug/projects", "./(all)/[workspaceSlug]/(projects)/projects/(list)/page.tsx"),
        ]),

        // Project Detail
        layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/layout.tsx", [
          // Project Issues List
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/issues",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/page.tsx"
            ),
          ]),
          // Issue Detail
          route(
            ":workspaceSlug/projects/:projectId/issues/:issueId",
            "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(detail)/[issueId]/page.tsx"
          ),

          // Sprint Detail
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/sprints/(detail)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/sprints/:sprintId",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/sprints/(detail)/[sprintId]/page.tsx"
            ),
          ]),

          // Sprints List
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/sprints/(list)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/sprints",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/sprints/(list)/page.tsx"
            ),
          ]),

          // Epic Detail
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/epics/(detail)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/epics/:epicId",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/epics/(detail)/[epicId]/page.tsx"
            ),
          ]),

          // Epics List
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/epics/(list)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/epics",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/epics/(list)/page.tsx"
            ),
          ]),

          // View Detail
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/views/(detail)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/views/:viewId",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/views/(detail)/[viewId]/page.tsx"
            ),
          ]),

          // Views List
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/views/(list)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/views",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/views/(list)/page.tsx"
            ),
          ]),

          // Page Detail
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/pages/(detail)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/pages/:pageId",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/pages/(detail)/[pageId]/page.tsx"
            ),
          ]),

          // Pages List
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/pages/(list)/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/pages",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/pages/(list)/page.tsx"
            ),
          ]),
          // Intake list
          layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/intake/layout.tsx", [
            route(
              ":workspaceSlug/projects/:projectId/intake",
              "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/intake/page.tsx"
            ),
          ]),
        ]),

        // Project Archives - Issues, Sprints, Epics
        // Project Archives - Issues - List
        layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/issues/(list)/layout.tsx", [
          route(
            ":workspaceSlug/projects/:projectId/archives/issues",
            "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/issues/(list)/page.tsx"
          ),
        ]),

        // Project Archives - Issues - Detail
        layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/issues/(detail)/layout.tsx", [
          route(
            ":workspaceSlug/projects/:projectId/archives/issues/:archivedIssueId",
            "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/issues/(detail)/[archivedIssueId]/page.tsx"
          ),
        ]),

        // Project Archives - Sprints
        layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/sprints/layout.tsx", [
          route(
            ":workspaceSlug/projects/:projectId/archives/sprints",
            "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/sprints/page.tsx"
          ),
        ]),

        // Project Archives - Epics
        layout("./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/epics/layout.tsx", [
          route(
            ":workspaceSlug/projects/:projectId/archives/epics",
            "./(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/archives/epics/page.tsx"
          ),
        ]),
      ]),

      // ====================================================================
      // WIKI MODE SECTION
      // ====================================================================
      layout("./(all)/[workspaceSlug]/(wiki)/layout.tsx", [
        // Wiki List
        layout("./(all)/[workspaceSlug]/(wiki)/wiki/(list)/layout.tsx", [
          route(":workspaceSlug/wiki", "./(all)/[workspaceSlug]/(wiki)/wiki/(list)/page.tsx"),
        ]),

        // Wiki Detail
        layout("./(all)/[workspaceSlug]/(wiki)/wiki/(detail)/[pageId]/layout.tsx", [
          route(":workspaceSlug/wiki/:pageId", "./(all)/[workspaceSlug]/(wiki)/wiki/(detail)/[pageId]/page.tsx"),
        ]),
      ]),

      // ====================================================================
      // RESOURCES MODE SECTION
      // ====================================================================
      layout("./(all)/[workspaceSlug]/(resources)/layout.tsx", [
        // Resources
        layout("./(all)/[workspaceSlug]/(resources)/resources/layout.tsx", [
          route(":workspaceSlug/resources", "./(all)/[workspaceSlug]/(resources)/resources/page.tsx"),
          route(
            ":workspaceSlug/resources/assignments",
            "./(all)/[workspaceSlug]/(resources)/resources/assignments/page.tsx"
          ),
        ]),
      ]),

      // ====================================================================
      // SETTINGS SECTION
      // ====================================================================
      layout("./(all)/[workspaceSlug]/(settings)/layout.tsx", [
        // --------------------------------------------------------------------
        // WORKSPACE SETTINGS
        // --------------------------------------------------------------------

        layout("./(all)/[workspaceSlug]/(settings)/settings/(workspace)/layout.tsx", [
          route(":workspaceSlug/settings", "./(all)/[workspaceSlug]/(settings)/settings/(workspace)/page.tsx"),
          route(
            ":workspaceSlug/settings/members",
            "./(all)/[workspaceSlug]/(settings)/settings/(workspace)/members/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/imports",
            "./(all)/[workspaceSlug]/(settings)/settings/(workspace)/imports/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/integrations",
            "./(all)/[workspaceSlug]/(settings)/settings/(workspace)/integrations/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/exports",
            "./(all)/[workspaceSlug]/(settings)/settings/(workspace)/exports/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/webhooks",
            "./(all)/[workspaceSlug]/(settings)/settings/(workspace)/webhooks/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/webhooks/:webhookId",
            "./(all)/[workspaceSlug]/(settings)/settings/(workspace)/webhooks/[webhookId]/page.tsx"
          ),
        ]),

        // --------------------------------------------------------------------
        // ACCOUNT SETTINGS
        // --------------------------------------------------------------------

        layout("./(all)/[workspaceSlug]/(settings)/settings/account/layout.tsx", [
          route(":workspaceSlug/settings/account", "./(all)/[workspaceSlug]/(settings)/settings/account/page.tsx"),
          route(
            ":workspaceSlug/settings/account/activity",
            "./(all)/[workspaceSlug]/(settings)/settings/account/activity/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/account/preferences",
            "./(all)/[workspaceSlug]/(settings)/settings/account/preferences/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/account/notifications",
            "./(all)/[workspaceSlug]/(settings)/settings/account/notifications/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/account/security",
            "./(all)/[workspaceSlug]/(settings)/settings/account/security/page.tsx"
          ),
          route(
            ":workspaceSlug/settings/account/api-tokens",
            "./(all)/[workspaceSlug]/(settings)/settings/account/api-tokens/page.tsx"
          ),
        ]),

        // --------------------------------------------------------------------
        // PROJECT SETTINGS
        // --------------------------------------------------------------------

        layout("./(all)/[workspaceSlug]/(settings)/settings/projects/layout.tsx", [
          // No Projects available page
          route(":workspaceSlug/settings/projects", "./(all)/[workspaceSlug]/(settings)/settings/projects/page.tsx"),
          layout("./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/layout.tsx", [
            // Project Settings
            route(
              ":workspaceSlug/settings/projects/:projectId",
              "./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/page.tsx"
            ),
            // Project Members
            route(
              ":workspaceSlug/settings/projects/:projectId/members",
              "./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/members/page.tsx"
            ),
            // Project Features
            route(
              ":workspaceSlug/settings/projects/:projectId/features",
              "./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/features/page.tsx"
            ),
            // Project States
            route(
              ":workspaceSlug/settings/projects/:projectId/states",
              "./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/states/page.tsx"
            ),
            // Project Labels
            route(
              ":workspaceSlug/settings/projects/:projectId/labels",
              "./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/labels/page.tsx"
            ),
            // Project Estimates
            route(
              ":workspaceSlug/settings/projects/:projectId/estimates",
              "./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/estimates/page.tsx"
            ),
            // Project Automations
            layout("./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/automations/layout.tsx", [
              route(
                ":workspaceSlug/settings/projects/:projectId/automations",
                "./(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/automations/page.tsx"
              ),
            ]),
          ]),
        ]),
      ]),
    ]),
    // ======================================================================
    // STANDALONE ROUTES (outside workspace context)
    // ======================================================================

    // --------------------------------------------------------------------
    // PROFILE SETTINGS
    // --------------------------------------------------------------------

    layout("./(all)/profile/layout.tsx", [
      route("profile", "./(all)/profile/page.tsx"),
      route("profile/activity", "./(all)/profile/activity/page.tsx"),
      route("profile/appearance", "./(all)/profile/appearance/page.tsx"),
      route("profile/notifications", "./(all)/profile/notifications/page.tsx"),
      route("profile/security", "./(all)/profile/security/page.tsx"),
    ]),
  ]),

  // ========================================================================
  // REDIRECT ROUTES
  // ========================================================================
  // Legacy URL redirects for backward compatibility

  // --------------------------------------------------------------------
  // REDIRECT ROUTES
  // --------------------------------------------------------------------

  // Project settings redirect: /:workspaceSlug/projects/:projectId/settings/:path*
  // → /:workspaceSlug/settings/projects/:projectId/:path*
  route(":workspaceSlug/projects/:projectId/settings/*", "routes/redirects/core/project-settings.tsx"),

  // Analytics redirect: /:workspaceSlug/analytics → /:workspaceSlug/analytics/overview
  route(":workspaceSlug/analytics", "routes/redirects/core/analytics.tsx"),

  // API tokens redirect: /:workspaceSlug/settings/api-tokens
  // → /:workspaceSlug/settings/account/api-tokens
  route(":workspaceSlug/settings/api-tokens", "routes/redirects/core/api-tokens.tsx"),

  // Inbox redirect: /:workspaceSlug/projects/:projectId/inbox
  // → /:workspaceSlug/projects/:projectId/intake
  route(":workspaceSlug/projects/:projectId/inbox", "routes/redirects/core/inbox.tsx"),

  // Sign-up redirects
  route("accounts/sign-up", "routes/redirects/core/accounts-signup.tsx"),

  // Sign-in redirects (all redirect to home page)
  route("sign-in", "routes/redirects/core/sign-in.tsx"),
  route("signin", "routes/redirects/core/signin.tsx"),
  route("login", "routes/redirects/core/login.tsx"),

  // Register redirect
  route("register", "routes/redirects/core/register.tsx"),
] satisfies RouteConfig;

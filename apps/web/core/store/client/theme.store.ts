import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Storage keys (matching existing MobX store localStorage keys)
const STORAGE_KEYS = {
  sidebar: "app_sidebar_collapsed",
  extendedSidebar: "extended_sidebar_collapsed",
  extendedProjectSidebar: "extended_project_sidebar_collapsed",
  profileSidebar: "profile_sidebar_collapsed",
  workspaceAnalyticsSidebar: "workspace_analytics_sidebar_collapsed",
  issueDetailSidebar: "issue_detail_sidebar_collapsed",
  epicDetailSidebar: "epic_detail_sidebar_collapsed",
  initiativesSidebar: "initiatives_sidebar_collapsed",
  projectOverviewSidebar: "project_overview_sidebar_collapsed",
  // Per-mode sidebar states
  wikiSidebar: "wiki_sidebar_collapsed",
  resourcesSidebar: "resources_sidebar_collapsed",
  projectsSidebar: "projects_sidebar_collapsed",
} as const;

interface ThemeState {
  // State
  isAnySidebarDropdownOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarPeek: boolean;
  isExtendedSidebarOpened: boolean;
  isExtendedProjectSidebarOpened: boolean;
  profileSidebarCollapsed: boolean;
  workspaceAnalyticsSidebarCollapsed: boolean;
  issueDetailSidebarCollapsed: boolean;
  epicDetailSidebarCollapsed: boolean;
  initiativesSidebarCollapsed: boolean;
  projectOverviewSidebarCollapsed: boolean;
  // Per-mode sidebar states
  wikiSidebarCollapsed: boolean;
  resourcesSidebarCollapsed: boolean;
  projectsSidebarCollapsed: boolean;
}

interface ThemeActions {
  // Actions
  toggleAnySidebarDropdown: (open?: boolean) => void;
  toggleSidebar: (collapsed?: boolean) => void;
  toggleSidebarPeek: (peek?: boolean) => void;
  toggleExtendedSidebar: (collapsed?: boolean) => void;
  toggleExtendedProjectSidebar: (collapsed?: boolean) => void;
  toggleProfileSidebar: (collapsed?: boolean) => void;
  toggleWorkspaceAnalyticsSidebar: (collapsed?: boolean) => void;
  toggleIssueDetailSidebar: (collapsed?: boolean) => void;
  toggleEpicDetailSidebar: (collapsed?: boolean) => void;
  toggleInitiativesSidebar: (collapsed?: boolean) => void;
  toggleProjectOverviewSidebar: (collapsed?: boolean) => void;
  // Per-mode sidebar actions
  toggleWikiSidebar: (collapsed?: boolean) => void;
  toggleResourcesSidebar: (collapsed?: boolean) => void;
  toggleProjectsSidebar: (collapsed?: boolean) => void;
}

export type ThemeStore = ThemeState & ThemeActions;

// Helper to read boolean from localStorage (for initial hydration from existing MobX data)
function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === "true";
}

// Initial state - reads from existing localStorage keys for migration compatibility
const getInitialState = (): ThemeState => ({
  isAnySidebarDropdownOpen: false,
  sidebarCollapsed: getStoredBoolean(STORAGE_KEYS.sidebar, false),
  sidebarPeek: false,
  isExtendedSidebarOpened: getStoredBoolean(STORAGE_KEYS.extendedSidebar, false),
  isExtendedProjectSidebarOpened: getStoredBoolean(STORAGE_KEYS.extendedProjectSidebar, false),
  profileSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.profileSidebar, false),
  workspaceAnalyticsSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.workspaceAnalyticsSidebar, false),
  issueDetailSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.issueDetailSidebar, false),
  epicDetailSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.epicDetailSidebar, false),
  initiativesSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.initiativesSidebar, false),
  projectOverviewSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.projectOverviewSidebar, false),
  // Per-mode sidebar states
  wikiSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.wikiSidebar, false),
  resourcesSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.resourcesSidebar, false),
  projectsSidebarCollapsed: getStoredBoolean(STORAGE_KEYS.projectsSidebar, false),
});

// Legacy interface for backward compatibility with MobX store
export interface IThemeStore {
  isAnySidebarDropdownOpen: boolean | undefined;
  sidebarCollapsed: boolean | undefined;
  sidebarPeek: boolean | undefined;
  isExtendedSidebarOpened: boolean | undefined;
  isExtendedProjectSidebarOpened: boolean | undefined;
  profileSidebarCollapsed: boolean | undefined;
  workspaceAnalyticsSidebarCollapsed: boolean | undefined;
  issueDetailSidebarCollapsed: boolean | undefined;
  epicDetailSidebarCollapsed: boolean | undefined;
  initiativesSidebarCollapsed: boolean | undefined;
  projectOverviewSidebarCollapsed: boolean | undefined;
  // Per-mode sidebar states
  wikiSidebarCollapsed: boolean | undefined;
  resourcesSidebarCollapsed: boolean | undefined;
  projectsSidebarCollapsed: boolean | undefined;
  toggleAnySidebarDropdown: (open?: boolean) => void;
  toggleSidebar: (collapsed?: boolean) => void;
  toggleSidebarPeek: (peek?: boolean) => void;
  toggleExtendedSidebar: (collapsed?: boolean) => void;
  toggleExtendedProjectSidebar: (collapsed?: boolean) => void;
  toggleProfileSidebar: (collapsed?: boolean) => void;
  toggleWorkspaceAnalyticsSidebar: (collapsed?: boolean) => void;
  toggleIssueDetailSidebar: (collapsed?: boolean) => void;
  toggleEpicDetailSidebar: (collapsed?: boolean) => void;
  toggleInitiativesSidebar: (collapsed?: boolean) => void;
  toggleProjectOverviewSidebar: (collapsed?: boolean) => void;
  // Per-mode sidebar actions
  toggleWikiSidebar: (collapsed?: boolean) => void;
  toggleResourcesSidebar: (collapsed?: boolean) => void;
  toggleProjectsSidebar: (collapsed?: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      toggleAnySidebarDropdown: (open) =>
        set((state) => ({
          isAnySidebarDropdownOpen: open ?? !state.isAnySidebarDropdownOpen,
        })),

      toggleSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.sidebarCollapsed;
          // Also write to legacy localStorage key for migration compatibility
          localStorage.setItem(STORAGE_KEYS.sidebar, newValue.toString());
          return { sidebarCollapsed: newValue };
        }),

      toggleSidebarPeek: (peek) =>
        set((state) => ({
          sidebarPeek: peek ?? !state.sidebarPeek,
        })),

      toggleExtendedSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.isExtendedSidebarOpened;
          localStorage.setItem(STORAGE_KEYS.extendedSidebar, newValue.toString());
          return { isExtendedSidebarOpened: newValue };
        }),

      toggleExtendedProjectSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.isExtendedProjectSidebarOpened;
          localStorage.setItem(STORAGE_KEYS.extendedProjectSidebar, newValue.toString());
          return { isExtendedProjectSidebarOpened: newValue };
        }),

      toggleProfileSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.profileSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.profileSidebar, newValue.toString());
          return { profileSidebarCollapsed: newValue };
        }),

      toggleWorkspaceAnalyticsSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.workspaceAnalyticsSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.workspaceAnalyticsSidebar, newValue.toString());
          return { workspaceAnalyticsSidebarCollapsed: newValue };
        }),

      toggleIssueDetailSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.issueDetailSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.issueDetailSidebar, newValue.toString());
          return { issueDetailSidebarCollapsed: newValue };
        }),

      toggleEpicDetailSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.epicDetailSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.epicDetailSidebar, newValue.toString());
          return { epicDetailSidebarCollapsed: newValue };
        }),

      toggleInitiativesSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.initiativesSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.initiativesSidebar, newValue.toString());
          return { initiativesSidebarCollapsed: newValue };
        }),

      toggleProjectOverviewSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.projectOverviewSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.projectOverviewSidebar, newValue.toString());
          return { projectOverviewSidebarCollapsed: newValue };
        }),

      // Per-mode sidebar toggle actions
      toggleWikiSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.wikiSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.wikiSidebar, newValue.toString());
          return { wikiSidebarCollapsed: newValue };
        }),

      toggleResourcesSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.resourcesSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.resourcesSidebar, newValue.toString());
          return { resourcesSidebarCollapsed: newValue };
        }),

      toggleProjectsSidebar: (collapsed) =>
        set((state) => {
          const newValue = collapsed ?? !state.projectsSidebarCollapsed;
          localStorage.setItem(STORAGE_KEYS.projectsSidebar, newValue.toString());
          return { projectsSidebarCollapsed: newValue };
        }),
    }),
    {
      name: "plane-theme-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist the state, not actions
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        isExtendedSidebarOpened: state.isExtendedSidebarOpened,
        isExtendedProjectSidebarOpened: state.isExtendedProjectSidebarOpened,
        profileSidebarCollapsed: state.profileSidebarCollapsed,
        workspaceAnalyticsSidebarCollapsed: state.workspaceAnalyticsSidebarCollapsed,
        issueDetailSidebarCollapsed: state.issueDetailSidebarCollapsed,
        epicDetailSidebarCollapsed: state.epicDetailSidebarCollapsed,
        initiativesSidebarCollapsed: state.initiativesSidebarCollapsed,
        projectOverviewSidebarCollapsed: state.projectOverviewSidebarCollapsed,
        // Per-mode sidebar states
        wikiSidebarCollapsed: state.wikiSidebarCollapsed,
        resourcesSidebarCollapsed: state.resourcesSidebarCollapsed,
        projectsSidebarCollapsed: state.projectsSidebarCollapsed,
      }),
    }
  )
);

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useThemeStore hook directly in React components
 */
export class ThemeStoreLegacy implements IThemeStore {
  get isAnySidebarDropdownOpen() {
    return useThemeStore.getState().isAnySidebarDropdownOpen;
  }
  get sidebarCollapsed() {
    return useThemeStore.getState().sidebarCollapsed;
  }
  get sidebarPeek() {
    return useThemeStore.getState().sidebarPeek;
  }
  get isExtendedSidebarOpened() {
    return useThemeStore.getState().isExtendedSidebarOpened;
  }
  get isExtendedProjectSidebarOpened() {
    return useThemeStore.getState().isExtendedProjectSidebarOpened;
  }
  get profileSidebarCollapsed() {
    return useThemeStore.getState().profileSidebarCollapsed;
  }
  get workspaceAnalyticsSidebarCollapsed() {
    return useThemeStore.getState().workspaceAnalyticsSidebarCollapsed;
  }
  get issueDetailSidebarCollapsed() {
    return useThemeStore.getState().issueDetailSidebarCollapsed;
  }
  get epicDetailSidebarCollapsed() {
    return useThemeStore.getState().epicDetailSidebarCollapsed;
  }
  get initiativesSidebarCollapsed() {
    return useThemeStore.getState().initiativesSidebarCollapsed;
  }
  get projectOverviewSidebarCollapsed() {
    return useThemeStore.getState().projectOverviewSidebarCollapsed;
  }
  // Per-mode sidebar state getters
  get wikiSidebarCollapsed() {
    return useThemeStore.getState().wikiSidebarCollapsed;
  }
  get resourcesSidebarCollapsed() {
    return useThemeStore.getState().resourcesSidebarCollapsed;
  }
  get projectsSidebarCollapsed() {
    return useThemeStore.getState().projectsSidebarCollapsed;
  }

  toggleAnySidebarDropdown = (open?: boolean) => useThemeStore.getState().toggleAnySidebarDropdown(open);
  toggleSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleSidebar(collapsed);
  toggleSidebarPeek = (peek?: boolean) => useThemeStore.getState().toggleSidebarPeek(peek);
  toggleExtendedSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleExtendedSidebar(collapsed);
  toggleExtendedProjectSidebar = (collapsed?: boolean) =>
    useThemeStore.getState().toggleExtendedProjectSidebar(collapsed);
  toggleProfileSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleProfileSidebar(collapsed);
  toggleWorkspaceAnalyticsSidebar = (collapsed?: boolean) =>
    useThemeStore.getState().toggleWorkspaceAnalyticsSidebar(collapsed);
  toggleIssueDetailSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleIssueDetailSidebar(collapsed);
  toggleEpicDetailSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleEpicDetailSidebar(collapsed);
  toggleInitiativesSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleInitiativesSidebar(collapsed);
  toggleProjectOverviewSidebar = (collapsed?: boolean) =>
    useThemeStore.getState().toggleProjectOverviewSidebar(collapsed);
  // Per-mode sidebar toggle actions
  toggleWikiSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleWikiSidebar(collapsed);
  toggleResourcesSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleResourcesSidebar(collapsed);
  toggleProjectsSidebar = (collapsed?: boolean) => useThemeStore.getState().toggleProjectsSidebar(collapsed);
}

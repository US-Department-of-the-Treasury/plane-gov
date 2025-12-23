import { useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { TWorkspaceMode, IWorkspaceModeLastVisited } from "@plane/types";
import { WORKSPACE_MODES } from "@plane/types";
import useLocalStorage from "./use-local-storage";

/**
 * Keyboard shortcut key to mode mapping
 * Cmd/Ctrl + 1 = Projects, 2 = Wiki, 3 = Resources
 */
const SHORTCUT_KEY_TO_MODE: Record<string, TWorkspaceMode> = {
  "1": "projects",
  "2": "wiki",
  "3": "resources",
};

/**
 * Derives the current workspace mode from the URL path
 * @returns The current workspace mode
 */
export function useModeFromPath(): TWorkspaceMode {
  const { workspaceSlug } = useParams();
  const pathname = usePathname();

  return useMemo(() => {
    if (!workspaceSlug || !pathname) return "projects";

    const basePath = `/${workspaceSlug}`;

    // Check for wiki mode
    if (pathname.startsWith(`${basePath}/wiki`)) {
      return "wiki";
    }

    // Check for resources mode
    if (pathname.startsWith(`${basePath}/resources`)) {
      return "resources";
    }

    // Default to projects mode
    return "projects";
  }, [workspaceSlug, pathname]);
}

const DEFAULT_LAST_VISITED: IWorkspaceModeLastVisited = {
  projects: null,
  wiki: null,
  resources: null,
};

/**
 * Manages mode navigation with last-visited path memory
 * Stores and retrieves the last visited path for each mode per workspace
 */
export function useModeNavigation() {
  const router = useRouter();
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  const currentMode = useModeFromPath();

  // LocalStorage key is per-workspace
  const storageKey = workspaceSlug ? `plane_lastVisited_${workspaceSlug}` : "plane_lastVisited";

  const { storedValue, setValue } = useLocalStorage<IWorkspaceModeLastVisited>(storageKey, DEFAULT_LAST_VISITED);

  const lastVisited = storedValue ?? DEFAULT_LAST_VISITED;

  // Track current path as last visited for the current mode
  useEffect(() => {
    if (!pathname || !workspaceSlug) return;

    // Only track paths within the workspace
    const basePath = `/${workspaceSlug}`;
    if (!pathname.startsWith(basePath)) return;

    // Don't track settings paths
    if (pathname.includes("/settings")) return;

    // Update last visited for current mode
    const newLastVisited = {
      ...lastVisited,
      [currentMode]: pathname,
    };

    // Only update if the path actually changed
    if (lastVisited[currentMode] !== pathname) {
      setValue(newLastVisited);
    }
  }, [pathname, workspaceSlug, currentMode, lastVisited, setValue]);

  /**
   * Get the default path for a mode
   */
  const getDefaultPath = useCallback(
    (mode: TWorkspaceMode): string => {
      if (!workspaceSlug) return "/";

      switch (mode) {
        case "wiki":
          return `/${workspaceSlug}/wiki`;
        case "resources":
          return `/${workspaceSlug}/resources`;
        case "projects":
        default:
          return `/${workspaceSlug}/`;
      }
    },
    [workspaceSlug]
  );

  /**
   * Navigate to a mode, using last-visited path if available
   */
  const navigateToMode = useCallback(
    (mode: TWorkspaceMode) => {
      if (!workspaceSlug) return;

      // If already in this mode, do nothing
      if (mode === currentMode) return;

      // Use last visited path or default
      const targetPath = lastVisited[mode] || getDefaultPath(mode);
      router.push(targetPath);
    },
    [workspaceSlug, currentMode, lastVisited, getDefaultPath, router]
  );

  /**
   * Get the path for a mode (last visited or default)
   */
  const getModeHref = useCallback(
    (mode: TWorkspaceMode): string => {
      return lastVisited[mode] || getDefaultPath(mode);
    },
    [lastVisited, getDefaultPath]
  );

  return {
    currentMode,
    lastVisited,
    navigateToMode,
    getModeHref,
    getDefaultPath,
    modes: WORKSPACE_MODES,
  };
}

/**
 * Hook to enable keyboard shortcuts for mode switching
 * Listens for Cmd/Ctrl + 1/2/3 to switch modes
 * Should be called once at the app/workspace level
 */
export function useModeKeyboardShortcuts() {
  const { navigateToMode } = useModeNavigation();
  const navigateToModeRef = useRef(navigateToMode);

  // Keep ref updated to avoid stale closures
  useEffect(() => {
    navigateToModeRef.current = navigateToMode;
  }, [navigateToMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMeta = event.metaKey || event.ctrlKey;
      if (!isMeta) return;

      // Check if the key is a mode shortcut
      const mode = SHORTCUT_KEY_TO_MODE[event.key];
      if (!mode) return;

      // Don't trigger if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[contenteditable='true']");

      if (isEditable) return;

      // Prevent default browser behavior (e.g., Cmd+1 might switch tabs)
      event.preventDefault();
      event.stopPropagation();

      // Navigate to the mode
      navigateToModeRef.current(mode);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}

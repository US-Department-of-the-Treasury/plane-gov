import type { Config } from "@react-router/dev/config";

// Inline helper to avoid @plane/utils import (config files are processed by esbuild
// before workspace packages are resolved)
// Must match vite.config.ts normalizeViteBasePath for Vite dev server compatibility
const normalizeBasePath = (basePath: string): string => {
  if (!basePath || basePath === "/") return "/";
  // Ensure leading slash and trailing slash (must match Vite base config)
  let normalized = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (!normalized.endsWith("/")) normalized = `${normalized}/`;
  return normalized;
};

const basePath = normalizeBasePath(process.env.VITE_ADMIN_BASE_PATH ?? "");

export default {
  appDirectory: "app",
  basename: basePath,
  // Admin runs as a client-side app; build a static client bundle only
  ssr: false,
} satisfies Config;

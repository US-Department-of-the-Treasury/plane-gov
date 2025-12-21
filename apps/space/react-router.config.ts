import type { Config } from "@react-router/dev/config";

// Inline helper to avoid @plane/utils import (config files are processed by esbuild
// before workspace packages are resolved)
const normalizeBasePath = (basePath: string): string => {
  if (!basePath || basePath === "/") return "/";
  // Ensure leading slash, remove trailing slash
  const normalized = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const basePath = normalizeBasePath(process.env.VITE_SPACE_BASE_PATH ?? "") || "/";

export default {
  appDirectory: "app",
  basename: basePath,
  ssr: true,
} satisfies Config;

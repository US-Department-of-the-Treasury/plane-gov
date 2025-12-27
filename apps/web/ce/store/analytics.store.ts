// Re-export from the Zustand store in client folder
// This maintains backward compatibility with imports from @/plane-web/store/analytics.store
export { useAnalyticsStore } from "@/store/client";
export type { AnalyticsStore } from "@/store/client";

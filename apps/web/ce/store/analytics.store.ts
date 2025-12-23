// Re-export from the Zustand store in client folder
// This maintains backward compatibility with imports from @/plane-web/store/analytics.store
export {
  useAnalyticsStore,
  AnalyticsStore,
} from "@/store/client";
export type { IAnalyticsStore, AnalyticsStoreType } from "@/store/client";

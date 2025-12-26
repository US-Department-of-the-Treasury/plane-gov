import type { IAnalyticsStore as IBaseAnalyticsStore } from "@/store/client/analytics.store";
import { AnalyticsStoreLegacy as BaseAnalyticsStore } from "@/store/client/analytics.store";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IAnalyticsStore extends IBaseAnalyticsStore {
  //observables
}

export class AnalyticsStore extends BaseAnalyticsStore {}

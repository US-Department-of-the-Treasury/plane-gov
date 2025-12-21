import type { RootStore } from "@/plane-web/store/root.store";
import { IssuesTimeLineStore } from "@/store/timeline/issues-timeline.store";
import type { IIssuesTimeLineStore } from "@/store/timeline/issues-timeline.store";
import { EpicsTimeLineStore } from "@/store/timeline/epics-timeline.store";
import type { IEpicsTimeLineStore } from "@/store/timeline/epics-timeline.store";
import { BaseTimeLineStore } from "./base-timeline.store";
import type { IBaseTimelineStore } from "./base-timeline.store";

export interface ITimelineStore {
  issuesTimeLineStore: IIssuesTimeLineStore;
  epicsTimeLineStore: IEpicsTimeLineStore;
  projectTimeLineStore: IBaseTimelineStore;
  groupedTimeLineStore: IBaseTimelineStore;
}

export class TimeLineStore implements ITimelineStore {
  issuesTimeLineStore: IIssuesTimeLineStore;
  epicsTimeLineStore: IEpicsTimeLineStore;
  projectTimeLineStore: IBaseTimelineStore;
  groupedTimeLineStore: IBaseTimelineStore;

  constructor(rootStore: RootStore) {
    this.issuesTimeLineStore = new IssuesTimeLineStore(rootStore);
    this.epicsTimeLineStore = new EpicsTimeLineStore(rootStore);
    // Dummy store
    this.projectTimeLineStore = new BaseTimeLineStore(rootStore);
    this.groupedTimeLineStore = new BaseTimeLineStore(rootStore);
  }
}

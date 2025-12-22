import { autorun } from "mobx";
// Store
import type { RootStore } from "@/plane-web/store/root.store";
import { BaseTimeLineStore } from "@/plane-web/store/timeline/base-timeline.store";
import type { IBaseTimelineStore } from "@/plane-web/store/timeline/base-timeline.store";

export interface IEpicsTimeLineStore extends IBaseTimelineStore {
  isDependencyEnabled: boolean;
}

export class EpicsTimeLineStore extends BaseTimeLineStore implements IEpicsTimeLineStore {
  constructor(_rootStore: RootStore) {
    super(_rootStore);

    autorun(() => {
      const getEpicById = this.rootStore.epic.getEpicById;
      this.updateBlocks(getEpicById);
    });
  }
}

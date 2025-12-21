import { action, makeObservable, observable, runInAction } from "mobx";
// plane imports
import { SitesSprintService } from "@plane/services";
import type { TPublicSprint } from "@/types/sprint";
// store
import type { CoreRootStore } from "./root.store";

export interface ISprintStore {
  // observables
  sprints: TPublicSprint[] | undefined;
  // computed actions
  getSprintById: (sprintId: string | undefined) => TPublicSprint | undefined;
  // fetch actions
  fetchSprints: (anchor: string) => Promise<TPublicSprint[]>;
}

export class SprintStore implements ISprintStore {
  sprints: TPublicSprint[] | undefined = undefined;
  sprintService: SitesSprintService;
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      sprints: observable,
      // fetch action
      fetchSprints: action,
    });
    this.sprintService = new SitesSprintService();
    this.rootStore = _rootStore;
  }

  getSprintById = (sprintId: string | undefined) => this.sprints?.find((sprint) => sprint.id === sprintId);

  fetchSprints = async (anchor: string) => {
    const sprintsResponse = await this.sprintService.list(anchor);
    runInAction(() => {
      this.sprints = sprintsResponse;
    });
    return sprintsResponse;
  };
}

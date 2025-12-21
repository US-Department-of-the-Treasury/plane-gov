import { set } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
// plane imports
import { SitesEpicService } from "@plane/services";
// types
import type { TPublicEpic } from "@/types/epics";
// root store
import type { CoreRootStore } from "./root.store";

export interface IIssueEpicStore {
  // observables
  epics: TPublicEpic[] | undefined;
  // computed actions
  getEpicById: (epicId: string | undefined) => TPublicEpic | undefined;
  getEpicsByIds: (epicIds: string[]) => TPublicEpic[];
  // fetch actions
  fetchEpics: (anchor: string) => Promise<TPublicEpic[]>;
}

export class EpicStore implements IIssueEpicStore {
  epicMap: Record<string, TPublicEpic> = {};
  epicService: SitesEpicService;
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      epicMap: observable,
      // computed
      epics: computed,
      // fetch action
      fetchEpics: action,
    });
    this.epicService = new SitesEpicService();
    this.rootStore = _rootStore;
  }

  get epics() {
    return Object.values(this.epicMap);
  }

  getEpicById = (epicId: string | undefined) => (epicId ? this.epicMap[epicId] : undefined);

  getEpicsByIds = (epicIds: string[]) => {
    const currEpics = [];
    for (const epicId of epicIds) {
      const epic = this.getEpicById(epicId);
      if (epic) {
        currEpics.push(epic);
      }
    }

    return currEpics;
  };

  fetchEpics = async (anchor: string) => {
    try {
      const epicsResponse = await this.epicService.list(anchor);
      runInAction(() => {
        this.epicMap = {};
        for (const epic of epicsResponse) {
          set(this.epicMap, [epic.id], epic);
        }
      });
      return epicsResponse;
    } catch (error) {
      console.error("Failed to fetch members:", error);
      return [];
    }
  };
}

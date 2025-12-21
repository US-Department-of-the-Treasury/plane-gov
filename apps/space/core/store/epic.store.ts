import { set } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
// plane imports
import { SitesModuleService } from "@plane/services";
// types
import type { TPublicModule } from "@/types/modules";
// root store
import type { CoreRootStore } from "./root.store";

export interface IIssueEpicStore {
  // observables
  modules: TPublicModule[] | undefined;
  // computed actions
  getEpicById: (epicId: string | undefined) => TPublicModule | undefined;
  getModulesByIds: (epicIds: string[]) => TPublicModule[];
  // fetch actions
  fetchEpics: (anchor: string) => Promise<TPublicModule[]>;
}

export class EpicStore implements IIssueEpicStore {
  moduleMap: Record<string, TPublicModule> = {};
  moduleService: SitesModuleService;
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      moduleMap: observable,
      // computed
      modules: computed,
      // fetch action
      fetchEpics: action,
    });
    this.moduleService = new SitesModuleService();
    this.rootStore = _rootStore;
  }

  get modules() {
    return Object.values(this.moduleMap);
  }

  getEpicById = (epicId: string | undefined) => (epicId ? this.moduleMap[epicId] : undefined);

  getModulesByIds = (epicIds: string[]) => {
    const currModules = [];
    for (const epicId of epicIds) {
      const issueModule = this.getEpicById(epicId);
      if (issueModule) {
        currModules.push(issueModule);
      }
    }

    return currModules;
  };

  fetchEpics = async (anchor: string) => {
    try {
      const modulesResponse = await this.moduleService.list(anchor);
      runInAction(() => {
        this.moduleMap = {};
        for (const issueModule of modulesResponse) {
          set(this.moduleMap, [issueModule.id], issueModule);
        }
      });
      return modulesResponse;
    } catch (error) {
      console.error("Failed to fetch members:", error);
      return [];
    }
  };
}

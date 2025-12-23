export interface IWorkspaceStore {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceStore implements IWorkspaceStore {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  constructor(data: IWorkspaceStore) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

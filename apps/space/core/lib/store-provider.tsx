import { createContext } from "react";
// plane web store
import { RootStore } from "@/plane-web/store/root.store";

let rootStore = new RootStore();

export const StoreContext = createContext(rootStore);

function initializeStore() {
  const singletonRootStore = rootStore ?? new RootStore();
  // For SSG and SSR always create a new store
  if (typeof window === "undefined") return singletonRootStore;
  // Create the store once in the client
  if (!rootStore) rootStore = singletonRootStore;
  return singletonRootStore;
}

export type StoreProviderProps = {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialState?: any;
};

export function StoreProvider({ children }: StoreProviderProps) {
  const store = initializeStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

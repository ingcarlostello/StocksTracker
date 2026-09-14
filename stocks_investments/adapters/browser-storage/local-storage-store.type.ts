// An external store for React's useSyncExternalStore, backed by one localStorage key.
export type LocalStorageStore = {
  subscribe: (listener: () => void) => () => void;
  // null when nothing is stored.
  getSnapshot: () => string | null;
  // undefined: the server cannot know what the browser stored.
  getServerSnapshot: () => undefined;
  set: (value: string) => void;
};

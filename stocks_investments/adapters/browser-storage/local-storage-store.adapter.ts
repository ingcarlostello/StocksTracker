import type { LocalStorageStore } from "./local-storage-store.type";

// The value is cached in memory, so the store keeps working for this tab when storage is unavailable
// (blocked site data, some private modes) or full; it just is not remembered after a reload then.
export function createLocalStorageStore(key: string): LocalStorageStore {
  const listeners = new Set<() => void>();
  let loaded = false;
  let current: string | null = null;

  function notify() {
    for (const listener of listeners) listener();
  }

  // Another tab changed the value (or cleared all storage, which reports key null).
  function handleStorage(event: StorageEvent) {
    if (event.key !== key && event.key !== null) return;
    current = event.key === null ? null : event.newValue;
    loaded = true;
    notify();
  }

  function getSnapshot(): string | null {
    if (!loaded) {
      loaded = true;
      try {
        current = window.localStorage.getItem(key);
      } catch {
        current = null;
      }
    }
    return current;
  }

  return {
    subscribe(listener) {
      if (listeners.size === 0) window.addEventListener("storage", handleStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
      };
    },
    getSnapshot,
    getServerSnapshot: () => undefined,
    set(value) {
      current = value;
      loaded = true;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Kept in memory only; see the note above.
      }
      notify();
    },
  };
}

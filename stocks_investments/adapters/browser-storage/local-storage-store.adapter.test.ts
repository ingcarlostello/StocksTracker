import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalStorageStore } from "./local-storage-store.adapter";

type StorageListener = (event: Pick<StorageEvent, "key" | "newValue">) => void;

function fakeWindow(options: { failing?: boolean; initial?: Record<string, string> } = {}) {
  const values = new Map(Object.entries(options.initial ?? {}));
  const listeners = new Set<StorageListener>();
  const blocked = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  const window = {
    localStorage: {
      getItem: options.failing ? blocked : (key: string) => values.get(key) ?? null,
      setItem: options.failing ? blocked : (key: string, value: string) => void values.set(key, value),
    },
    addEventListener: (_type: string, listener: StorageListener) => void listeners.add(listener),
    removeEventListener: (_type: string, listener: StorageListener) => void listeners.delete(listener),
  };
  vi.stubGlobal("window", window);
  return { values, listeners };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createLocalStorageStore", () => {
  it("reads the stored value, or null when nothing is stored", () => {
    fakeWindow({ initial: { active: "p1" } });
    expect(createLocalStorageStore("active").getSnapshot()).toBe("p1");
    expect(createLocalStorageStore("other").getSnapshot()).toBeNull();
  });

  it("writes the value, persists it and notifies subscribers", () => {
    const { values } = fakeWindow();
    const store = createLocalStorageStore("active");
    const listener = vi.fn();
    store.subscribe(listener);
    store.set("p2");
    expect(store.getSnapshot()).toBe("p2");
    expect(values.get("active")).toBe("p2");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps working in memory when storage is blocked", () => {
    fakeWindow({ failing: true });
    const store = createLocalStorageStore("active");
    expect(store.getSnapshot()).toBeNull();
    store.set("p3");
    expect(store.getSnapshot()).toBe("p3");
  });

  it("follows changes made in another tab, including clearing storage", () => {
    const { listeners } = fakeWindow();
    const store = createLocalStorageStore("active");
    const listener = vi.fn();
    store.subscribe(listener);
    for (const handle of listeners) handle({ key: "active", newValue: "p4" });
    expect(store.getSnapshot()).toBe("p4");
    for (const handle of listeners) handle({ key: "unrelated", newValue: "x" });
    expect(store.getSnapshot()).toBe("p4");
    for (const handle of listeners) handle({ key: null, newValue: null });
    expect(store.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops listening to other tabs once the last subscriber leaves", () => {
    const { listeners } = fakeWindow();
    const store = createLocalStorageStore("active");
    const unsubscribeA = store.subscribe(() => {});
    const unsubscribeB = store.subscribe(() => {});
    expect(listeners.size).toBe(1);
    unsubscribeA();
    expect(listeners.size).toBe(1);
    unsubscribeB();
    expect(listeners.size).toBe(0);
  });

  it("reports nothing on the server", () => {
    expect(createLocalStorageStore("active").getServerSnapshot()).toBeUndefined();
  });
});

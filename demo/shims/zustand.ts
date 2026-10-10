// تجربة محلية فقط: تنفيذ مصغر متوافق مع واجهة zustand (create + persist)
import { useSyncExternalStore } from "react";
type SetState<T> = (p: Partial<T> | ((s: T) => Partial<T>), replace?: boolean) => void;
interface Api<T> { setState: SetState<T>; getState: () => T; subscribe: (l: () => void) => () => void }
function createImpl<T>(init: (set: SetState<T>, get: () => T, api: Api<T>) => T) {
  let state: T;
  const listeners = new Set<() => void>();
  const api: Api<T> = {
    setState: (p, replace) => {
      const next = typeof p === "function" ? (p as (s: T) => Partial<T>)(state) : p;
      state = replace ? (next as T) : { ...state, ...next };
      listeners.forEach((l) => l());
    },
    getState: () => state,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
  state = init((p, r) => api.setState(p, r), api.getState, api);
  const hook = <U,>(sel: (s: T) => U = (s) => s as unknown as U) => useSyncExternalStore(api.subscribe, () => sel(state), () => sel(state));
  return Object.assign(hook, api);
}
export function create<T>(init?: (set: SetState<T>, get: () => T, api: Api<T>) => T): any {
  return init ? createImpl(init) : (i: typeof init) => createImpl(i!);
}
export function persist<T>(config: (set: SetState<T>, get: () => T, api: Api<T>) => T, opts: { name: string; partialize?: (s: T) => unknown }) {
  return (set: SetState<T>, get: () => T, api: Api<T>) => {
    const save = () => { try { localStorage.setItem(opts.name, JSON.stringify({ state: opts.partialize ? opts.partialize(get()) : get(), version: 0 })); } catch {} };
    const wrapped: SetState<T> = (p, r) => { set(p, r); save(); };
    const orig = api.setState;
    api.setState = (p, r) => { orig(p, r); save(); };
    const initial = config(wrapped, get, api);
    try {
      const raw = localStorage.getItem(opts.name);
      if (raw) return { ...initial, ...JSON.parse(raw).state };
    } catch {}
    return initial;
  };
}

import { useSyncExternalStore } from "react";

/**
 * Store mínimo WebGL → DOM para eventos discretos (hover/selección).
 * Sin dependencias: si crece, migrar a zustand con la misma API.
 */
type UIState = { hoveredId: string | null };

let state: UIState = { hoveredId: null };
const listeners = new Set<() => void>();

export const uiStore = {
  get: () => state,
  set(partial: Partial<UIState>) {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const serverSnapshot: UIState = { hoveredId: null };

export function useUI<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(
    uiStore.subscribe,
    () => selector(uiStore.get()),
    () => selector(serverSnapshot),
  );
}

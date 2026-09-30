import { useSyncExternalStore } from "react";

/**
 * Registro global de "cosas que faltan por cargar" para el loader inicial.
 * Cualquier parte de la app declara `pending("x")` y luego `done("x")`.
 * Sin three.js aquí: lo importa el layout y debe quedar liviano.
 */
const tasks = new Map<string, boolean>();
const listeners = new Set<() => void>();
let snapshot = { total: 0, done: 0 };

function emit() {
  const values = [...tasks.values()];
  snapshot = { total: values.length, done: values.filter(Boolean).length };
  listeners.forEach((l) => l());
}

export function pending(name: string) {
  if (tasks.has(name)) return;
  tasks.set(name, false);
  emit();
}

export function done(name: string) {
  if (tasks.get(name) === true) return;
  tasks.set(name, true);
  emit();
}

const server = { total: 0, done: 0 };

export function useLoading() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => server,
  );
}

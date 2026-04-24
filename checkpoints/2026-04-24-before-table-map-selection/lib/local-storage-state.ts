"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

type Listener = () => void;
type Parser<T> = (raw: string) => T | null;
type Serializer<T> = (value: T) => string;

const listenersByKey = new Map<string, Set<Listener>>();

const getListeners = (key: string) => {
  const existing = listenersByKey.get(key);
  if (existing) {
    return existing;
  }

  const created = new Set<Listener>();
  listenersByKey.set(key, created);
  return created;
};

const notifyKey = (key: string) => {
  for (const listener of getListeners(key)) {
    listener();
  }
};

const readLocalStorageSnapshot = (key: string, fallbackSnapshot: string): string => {
  if (typeof window === "undefined") {
    return fallbackSnapshot;
  }

  const saved = window.localStorage.getItem(key);
  return saved ?? fallbackSnapshot;
};

const subscribeToKey = (key: string, callback: Listener) => {
  const listeners = getListeners(key);
  listeners.add(callback);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(callback);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
};

export const writeLocalStorageValue = <T>(
  key: string,
  value: T,
  serialize: Serializer<T> = JSON.stringify,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, serialize(value));
  notifyKey(key);
};

export const removeLocalStorageValue = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  notifyKey(key);
};

const resolveParsedValue = <T>(raw: string, fallback: T, parse: Parser<T>) => {
  try {
    return parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

export const useHydratedLocalStorageState = <T>(
  key: string,
  fallback: T,
  parse: Parser<T>,
  serialize: Serializer<T> = JSON.stringify,
): [T, Dispatch<SetStateAction<T>>] => {
  const fallbackSnapshot = useMemo(
    () => serialize(fallback),
    [fallback, serialize],
  );
  const rawSnapshot = useSyncExternalStore(
    (callback) => subscribeToKey(key, callback),
    () => readLocalStorageSnapshot(key, fallbackSnapshot),
    () => fallbackSnapshot,
  );
  const value = useMemo(
    () => resolveParsedValue(rawSnapshot, fallback, parse),
    [fallback, parse, rawSnapshot],
  );

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
    const currentRawSnapshot = readLocalStorageSnapshot(key, fallbackSnapshot);
    const currentValue = resolveParsedValue(currentRawSnapshot, fallback, parse);
    const resolvedValue =
      typeof nextValue === "function"
        ? (nextValue as (current: T) => T)(currentValue)
        : nextValue;

    writeLocalStorageValue(key, resolvedValue, serialize);
  }, [fallback, fallbackSnapshot, key, parse, serialize]);

  return [value, setValue];
};

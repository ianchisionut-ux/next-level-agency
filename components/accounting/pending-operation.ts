"use client";

export type PendingOperation<T extends object> = { operationKey: string; payload: T };

/** Keep both the identifier and original request across an uncertain response. */
export function readPendingOperation<T extends object>(storageKey: string): PendingOperation<T> | null {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingOperation<T>;
  if (!value || !/^[A-Za-z0-9:_-]{16,160}$/.test(value.operationKey) || !value.payload || typeof value.payload !== "object" || Array.isArray(value.payload)) {
    throw new Error("Operațiunea anterioară nu poate fi citită. Verifică documentele existente înainte de a continua.");
  }
  return value;
}

export function pendingOperation<T extends object>(storageKey: string, payload: T): PendingOperation<T> {
  const previous = readPendingOperation<T>(storageKey);
  const value = { operationKey: previous?.operationKey || crypto.randomUUID(), payload };
  // Persist before sending; unavailable storage must never allow an unsafe retry.
  sessionStorage.setItem(storageKey, JSON.stringify(value));
  return value;
}

export function completePendingOperation(storageKey: string) {
  sessionStorage.removeItem(storageKey);
}

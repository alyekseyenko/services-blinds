const chains = new Map<string, Promise<unknown>>();

/** Serializes async work per key within a single Node process. */
export function withProcessMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(() => fn());
  chains.set(key, run);
  return run.finally(() => {
    if (chains.get(key) === run) {
      chains.delete(key);
    }
  }) as Promise<T>;
}

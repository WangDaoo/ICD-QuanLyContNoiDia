export type ReadCacheScope = { userId: string; apiBaseUrl: string; icdId: string };
export type ReadCacheKind = 'work-queue' | 'container' | 'profile';
export type CachedRead<T> = { data: T; savedAt: number };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void>; getAllKeys(): Promise<readonly string[]>; multiRemove(keys: string[]): Promise<void> };
export const READ_CACHE_TTL = { 'work-queue': 5 * 60000, container: 10 * 60000, profile: 30 * 60000 } as const;
const PREFIX = 'icd.mobile.read.v1.';
const partition = (scope: ReadCacheScope) => PREFIX + encodeURIComponent(JSON.stringify([scope.userId, scope.apiBaseUrl.replace(/\/+$/, ''), scope.icdId])) + '.';
export function createReadCache(storage: Storage, now: () => number = Date.now) {
  const generations = new Map<string, number>();
  const mutations = new Map<string, Promise<void>>();
  const mutate = (scopeKey: string, action: () => Promise<void>): Promise<void> => {
    const next = (mutations.get(scopeKey) ?? Promise.resolve()).then(action, action);
    const settled = next.catch(() => {});
    mutations.set(scopeKey, settled);
    void settled.then(() => { if (mutations.get(scopeKey) === settled) mutations.delete(scopeKey); });
    return next;
  };
  return {
    async write<T>(scope: ReadCacheScope, kind: ReadCacheKind, query: string, data: T): Promise<void> {
      const scopeKey = partition(scope), generation = generations.get(scopeKey) || 0;
      const key = scopeKey + kind + '.' + encodeURIComponent(query);
      await mutate(scopeKey, async () => {
        if (generation !== (generations.get(scopeKey) || 0)) return;
        await storage.setItem(key, JSON.stringify({ data, savedAt: now() }));
      });
    },
    async read<T>(scope: ReadCacheScope, kind: ReadCacheKind, query: string): Promise<CachedRead<T> | null> {
      const scopeKey = partition(scope), generation = generations.get(scopeKey) || 0;
      const key = scopeKey + kind + '.' + encodeURIComponent(query);
      try {
        const raw = await storage.getItem(key);
        if (!raw || generation !== (generations.get(scopeKey) || 0)) return null;
        const cached = JSON.parse(raw) as CachedRead<T>;
        const age = now() - cached.savedAt;
        if (!Number.isFinite(cached.savedAt) || age < 0 || age > READ_CACHE_TTL[kind] || !('data' in cached)) {
          await mutate(scopeKey, async () => {
            // A newer read response may have replaced this expired snapshot.
            if (await storage.getItem(key) === raw) await storage.removeItem(key);
          });
          return null;
        }
        return cached;
      } catch { return null; }
    },
    async clearUser(scope: ReadCacheScope): Promise<void> {
      const scopeKey = partition(scope);
      generations.set(scopeKey, (generations.get(scopeKey) || 0) + 1);
      await mutate(scopeKey, async () => {
        const keys = (await storage.getAllKeys()).filter(key => key.startsWith(scopeKey));
        if (keys.length) await storage.multiRemove(keys);
      });
    },
  };
}

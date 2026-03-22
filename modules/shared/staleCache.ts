import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@KindMinds:ModuleCache:';
const DEFAULT_MEMORY_ENTRIES = 32;

export type CacheTier = 'memory-only' | 'disk' | 'hybrid';
export type CacheCategory = 'critical' | 'summary' | 'detail' | 'heavy';

export interface CachePolicy {
    memoryTtlMs: number;
    diskTtlMs: number;
    tier: CacheTier;
    category: CacheCategory;
    prunePriority?: number;
}

export interface CachedResource<T> {
    data: T;
    updatedAt: number;
    lastAccessedAt: number;
    tier: CacheTier;
    category: CacheCategory;
    prunePriority?: number;
}

export interface PruneCacheOptions {
    category?: CacheCategory;
    maxEntries?: number;
    force?: boolean;
}

export interface CacheReadOptions {
    allowStale?: boolean;
    preserveExpired?: boolean;
}

export const CACHE_POLICIES: Record<CacheCategory, CachePolicy> = {
    critical: {
        category: 'critical',
        tier: 'hybrid',
        memoryTtlMs: 5 * 60 * 1000,
        diskTtlMs: 15 * 60 * 1000,
        prunePriority: 4,
    },
    summary: {
        category: 'summary',
        tier: 'hybrid',
        memoryTtlMs: 2 * 60 * 1000,
        diskTtlMs: 5 * 60 * 1000,
        prunePriority: 3,
    },
    detail: {
        category: 'detail',
        tier: 'hybrid',
        memoryTtlMs: 60 * 1000,
        diskTtlMs: 2 * 60 * 1000,
        prunePriority: 2,
    },
    heavy: {
        category: 'heavy',
        tier: 'memory-only',
        memoryTtlMs: 30 * 1000,
        diskTtlMs: 0,
        prunePriority: 1,
    },
};

export type CacheInput = CacheCategory | Partial<CachePolicy> | undefined;
type StorageAdapter = Pick<typeof AsyncStorage, 'getAllKeys' | 'getItem' | 'multiRemove' | 'removeItem' | 'setItem'>;

const memoryCache = new Map<string, CachedResource<unknown>>();
let storageAdapter: StorageAdapter = AsyncStorage;

function getStorageKey(key: string): string {
    return CACHE_PREFIX + key;
}

function canUseMemory(policy: CachePolicy): boolean {
    return policy.tier === 'memory-only' || policy.tier === 'hybrid';
}

function canUseDisk(policy: CachePolicy): boolean {
    return policy.tier === 'disk' || policy.tier === 'hybrid';
}

function getPolicySeed(input?: CacheInput): CachePolicy {
    if (!input) {
        return CACHE_POLICIES.summary;
    }

    if (typeof input === 'string') {
        return CACHE_POLICIES[input];
    }

    const category = input.category ?? 'summary';
    return {
        ...CACHE_POLICIES[category],
        ...input,
        category,
    };
}

export function resolveCachePolicy(input?: CacheInput): CachePolicy {
    const policy = getPolicySeed(input);
    return {
        ...policy,
        tier: policy.diskTtlMs <= 0 && policy.tier === 'hybrid' ? 'memory-only' : policy.tier,
    };
}

export function isCacheFresh(updatedAt: number, staleTimeMs: number, now = Date.now()): boolean {
    return now - updatedAt <= staleTimeMs;
}

function isCachedResource<T>(value: unknown): value is CachedResource<T> {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as CachedResource<T>;
    return typeof candidate.updatedAt === 'number' && 'data' in candidate;
}

function createPayload<T>(data: T, policy: CachePolicy, now = Date.now()): CachedResource<T> {
    return {
        data,
        updatedAt: now,
        lastAccessedAt: now,
        tier: policy.tier,
        category: policy.category,
        prunePriority: policy.prunePriority,
    };
}

function getEntryTtl(entry: CachedResource<unknown>, policy: CachePolicy, layer: 'memory' | 'disk'): number {
    const entryPolicy = resolveCachePolicy({
        category: entry.category,
        tier: entry.tier,
        prunePriority: entry.prunePriority,
    });
    const basePolicy = {
        ...entryPolicy,
        ...policy,
        category: policy.category || entry.category,
    };
    return layer === 'memory' ? basePolicy.memoryTtlMs : basePolicy.diskTtlMs;
}

async function removeDiskKey(key: string): Promise<void> {
    try {
        await storageAdapter.removeItem(getStorageKey(key));
    } catch (error) {
        console.error(`Failed to clear module cache for ${key}`, error);
    }
}

function touchMemoryEntry(key: string, entry: CachedResource<unknown>): void {
    memoryCache.set(key, {
        ...entry,
        lastAccessedAt: Date.now(),
    });
}

export function getMemoryCacheSnapshot(): Array<{ key: string; entry: CachedResource<unknown> }> {
    return Array.from(memoryCache.entries()).map(([key, entry]) => ({ key, entry }));
}

export function setCacheStorageAdapter(adapter: StorageAdapter): void {
    storageAdapter = adapter;
}

export function resetCacheStorageAdapter(): void {
    storageAdapter = AsyncStorage;
}

export async function getCachedResource<T>(
    key: string,
    input?: CacheInput,
    readOptions: CacheReadOptions = {}
): Promise<CachedResource<T> | null> {
    const policy = resolveCachePolicy(input);
    const allowStale = readOptions.allowStale === true;
    const preserveExpired = readOptions.preserveExpired === true || allowStale;

    if (canUseMemory(policy)) {
        const memoryEntry = memoryCache.get(key);
        if (memoryEntry) {
            if (isCacheFresh(memoryEntry.updatedAt, getEntryTtl(memoryEntry, policy, 'memory')) || allowStale) {
                touchMemoryEntry(key, memoryEntry);
                return memoryCache.get(key) as CachedResource<T>;
            }

            if (!preserveExpired) {
                memoryCache.delete(key);
            }
        }
    }

    if (!canUseDisk(policy)) {
        return null;
    }

    try {
        const raw = await storageAdapter.getItem(getStorageKey(key));
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!isCachedResource<T>(parsed)) {
            await removeDiskKey(key);
            return null;
        }

        const hydrated: CachedResource<T> = {
            ...parsed,
            lastAccessedAt: Date.now(),
            category: parsed.category ?? policy.category,
            tier: parsed.tier ?? policy.tier,
            prunePriority: parsed.prunePriority ?? policy.prunePriority,
        };

        if (!isCacheFresh(parsed.updatedAt, getEntryTtl(parsed, policy, 'disk')) && !allowStale) {
            if (!preserveExpired) {
                await removeDiskKey(key);
            }
            return null;
        }

        if (canUseMemory(policy)) {
            memoryCache.set(key, hydrated);
            await pruneCache({ maxEntries: DEFAULT_MEMORY_ENTRIES });
        }

        return hydrated;
    } catch (error) {
        console.error(`Failed to read module cache for ${key}`, error);
        return null;
    }
}

export async function setCachedResource<T>(key: string, data: T, input?: CacheInput): Promise<CachedResource<T>> {
    const policy = resolveCachePolicy(input);
    const payload = createPayload(data, policy);

    if (canUseMemory(policy)) {
        memoryCache.set(key, payload as CachedResource<unknown>);
        await pruneCache({ maxEntries: DEFAULT_MEMORY_ENTRIES });
    }

    if (canUseDisk(policy)) {
        try {
            await storageAdapter.setItem(getStorageKey(key), JSON.stringify(payload));
        } catch (error) {
            console.error(`Failed to persist module cache for ${key}`, error);
        }
    }

    return payload;
}

export async function clearCachedResource(key: string): Promise<void> {
    memoryCache.delete(key);
    await removeDiskKey(key);
}

export async function clearCacheByPrefix(prefix: string): Promise<void> {
    const matchingMemoryKeys = Array.from(memoryCache.keys()).filter((key) => key.startsWith(prefix));
    matchingMemoryKeys.forEach((key) => memoryCache.delete(key));

    try {
        const keys = await storageAdapter.getAllKeys();
        const matchingDiskKeys = keys.filter((key) => key.startsWith(getStorageKey(prefix)));
        if (matchingDiskKeys.length > 0) {
            await storageAdapter.multiRemove(matchingDiskKeys);
        }
    } catch (error) {
        console.error(`Failed to clear module cache prefix for ${prefix}`, error);
    }
}

export async function touchCachedResource(key: string): Promise<void> {
    const memoryEntry = memoryCache.get(key);
    if (memoryEntry) {
        touchMemoryEntry(key, memoryEntry);
    }

    try {
        const raw = await storageAdapter.getItem(getStorageKey(key));
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!isCachedResource(parsed)) return;
        parsed.lastAccessedAt = Date.now();
        await storageAdapter.setItem(getStorageKey(key), JSON.stringify(parsed));
    } catch (error) {
        console.error(`Failed to touch module cache for ${key}`, error);
    }
}

function shouldRemoveEntry(entry: CachedResource<unknown>, options: PruneCacheOptions, now: number): boolean {
    if (options.force) {
        return !options.category || entry.category === options.category;
    }

    if (options.category && entry.category !== options.category) {
        return false;
    }

    const policy = resolveCachePolicy({
        category: entry.category,
        tier: entry.tier,
        prunePriority: entry.prunePriority,
    });
    return !isCacheFresh(entry.updatedAt, policy.memoryTtlMs, now);
}

function sortForPrune(left: { key: string; entry: CachedResource<unknown> }, right: { key: string; entry: CachedResource<unknown> }): number {
    const leftPriority = left.entry.prunePriority ?? CACHE_POLICIES[left.entry.category].prunePriority ?? 0;
    const rightPriority = right.entry.prunePriority ?? CACHE_POLICIES[right.entry.category].prunePriority ?? 0;

    if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
    }

    return left.entry.lastAccessedAt - right.entry.lastAccessedAt;
}

export async function pruneCache(options: PruneCacheOptions = {}): Promise<void> {
    const now = Date.now();
    const snapshot = getMemoryCacheSnapshot();
    const directRemovals = snapshot
        .filter(({ entry }) => shouldRemoveEntry(entry, options, now))
        .map(({ key }) => key);

    directRemovals.forEach((key) => memoryCache.delete(key));

    const maxEntries = options.maxEntries ?? DEFAULT_MEMORY_ENTRIES;
    const nextSnapshot = getMemoryCacheSnapshot()
        .filter(({ entry }) => !options.category || entry.category === options.category)
        .sort(sortForPrune);

    if (nextSnapshot.length > maxEntries) {
        const overflow = nextSnapshot.slice(0, nextSnapshot.length - maxEntries);
        overflow.forEach(({ key }) => memoryCache.delete(key));
    }
}

export async function resetMemoryCache(): Promise<void> {
    memoryCache.clear();
}

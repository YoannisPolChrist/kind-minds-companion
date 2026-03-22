import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    clearCacheByPrefix,
    CACHE_POLICIES,
    getCachedResource,
    getMemoryCacheSnapshot,
    isCacheFresh,
    pruneCache,
    resetCacheStorageAdapter,
    resetMemoryCache,
    setCachedResource,
    setCacheStorageAdapter,
} from '../../../modules/shared/staleCache';

function createStorageAdapter() {
    const store = new Map<string, string>();
    let getItemCalls = 0;

    return {
        store,
        stats: {
            get getItemCalls() {
                return getItemCalls;
            },
            reset() {
                getItemCalls = 0;
            },
        },
        adapter: {
            async getItem(key: string) {
                getItemCalls += 1;
                return store.get(key) ?? null;
            },
            async setItem(key: string, value: string) {
                store.set(key, value);
            },
            async removeItem(key: string) {
                store.delete(key);
            },
            async getAllKeys() {
                return Array.from(store.keys());
            },
            async multiRemove(keys: readonly string[]) {
                keys.forEach((key) => store.delete(key));
            },
        },
    };
}

let storage = createStorageAdapter();

beforeEach(async () => {
    storage = createStorageAdapter();
    setCacheStorageAdapter(storage.adapter as any);
    await resetMemoryCache();
});

afterEach(async () => {
    resetCacheStorageAdapter();
    await resetMemoryCache();
});

test('isCacheFresh returns true inside the stale window', () => {
    assert.equal(isCacheFresh(1_000, 500, 1_400), true);
});

test('isCacheFresh returns false outside the stale window', () => {
    assert.equal(isCacheFresh(1_000, 500, 1_700), false);
});

test('memory hits are preferred before disk reads', async () => {
    await setCachedResource('summary:item', { value: 1 }, 'summary');
    storage.stats.reset();

    const cached = await getCachedResource<{ value: number }>('summary:item', 'summary');

    assert.deepEqual(cached?.data, { value: 1 });
    assert.equal(storage.stats.getItemCalls, 0);
});

test('preserveExpired keeps stale disk entries available for a later offline fallback', async () => {
    const shortPolicy = {
        category: 'summary',
        memoryTtlMs: 1,
        diskTtlMs: 1,
    } as const;
    await setCachedResource('summary:item', { value: 1 }, shortPolicy);
    await resetMemoryCache();
    await new Promise((resolve) => setTimeout(resolve, 5));

    const cached = await getCachedResource<{ value: number }>('summary:item', shortPolicy, { preserveExpired: true });

    assert.equal(cached, null);
    assert.equal(storage.store.size, 1);
});

test('allowStale returns an expired disk entry for offline reads', async () => {
    const shortPolicy = {
        category: 'summary',
        memoryTtlMs: 1,
        diskTtlMs: 1,
    } as const;
    await setCachedResource('summary:item', { value: 1 }, shortPolicy);
    await resetMemoryCache();
    await new Promise((resolve) => setTimeout(resolve, 5));

    const cached = await getCachedResource<{ value: number }>('summary:item', shortPolicy, {
        allowStale: true,
        preserveExpired: true,
    });

    assert.deepEqual(cached?.data, { value: 1 });
});

test('heavy entries stay out of persistent storage', async () => {
    await setCachedResource('heavy:item', { value: 'transient' }, 'heavy');

    assert.equal(storage.store.size, 0);
    assert.equal(getMemoryCacheSnapshot().length, 1);
});

test('pruneCache removes lower priority heavy entries first', async () => {
    await setCachedResource('critical:item', { value: 'keep' }, 'critical');
    await setCachedResource('heavy:item', { value: 'drop' }, 'heavy');

    await pruneCache({ maxEntries: 1 });

    const keys = getMemoryCacheSnapshot().map(({ key }) => key);
    assert.deepEqual(keys, ['critical:item']);
});

test('clearCacheByPrefix removes matching memory and disk entries only', async () => {
    await setCachedResource('templates:list:1', { value: 1 }, 'summary');
    await setCachedResource('templates:detail:1', { value: 2 }, 'detail');
    await setCachedResource('resources:list', { value: 3 }, 'summary');

    await clearCacheByPrefix('templates:');

    assert.equal(await getCachedResource('templates:list:1', 'summary'), null);
    assert.equal(await getCachedResource('templates:detail:1', 'detail'), null);
    assert.deepEqual((await getCachedResource<{ value: number }>('resources:list', 'summary'))?.data, { value: 3 });
});

test('policy defaults expose the expected tiered cache timings', () => {
    assert.equal(CACHE_POLICIES.critical.memoryTtlMs, 5 * 60 * 1000);
    assert.equal(CACHE_POLICIES.summary.diskTtlMs, 5 * 60 * 1000);
    assert.equal(CACHE_POLICIES.detail.diskTtlMs, 2 * 60 * 1000);
    assert.equal(CACHE_POLICIES.heavy.tier, 'memory-only');
});

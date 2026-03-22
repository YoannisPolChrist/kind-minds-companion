import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    resetCacheStorageAdapter,
    resetMemoryCache,
    setCacheStorageAdapter,
    setCachedResource,
} from '../../../modules/shared/staleCache';
import { loadCachedQuery } from '../../../modules/shared/readThroughCache';

function createStorageAdapter() {
    const store = new Map<string, string>();

    return {
        adapter: {
            async getItem(key: string) {
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

test('loadCachedQuery returns a fresh cache hit without calling the loader', async () => {
    await setCachedResource('query:item', { value: 1 }, 'summary');
    let loadCalls = 0;

    const data = await loadCachedQuery({
        key: 'query:item',
        policy: 'summary',
        load: async () => {
            loadCalls += 1;
            return { value: 2 };
        },
    });

    assert.deepEqual(data, { value: 1 });
    assert.equal(loadCalls, 0);
});

test('loadCachedQuery falls back to stale disk data when the loader fails', async () => {
    const shortPolicy = {
        category: 'summary',
        memoryTtlMs: 1,
        diskTtlMs: 1,
    } as const;
    await setCachedResource('query:item', { value: 1 }, shortPolicy);
    await resetMemoryCache();
    await new Promise((resolve) => setTimeout(resolve, 5));
    let loadCalls = 0;

    const data = await loadCachedQuery({
        key: 'query:item',
        policy: shortPolicy,
        load: async () => {
            loadCalls += 1;
            throw new Error('offline');
        },
    });

    assert.deepEqual(data, { value: 1 });
    assert.equal(loadCalls, 1);
});

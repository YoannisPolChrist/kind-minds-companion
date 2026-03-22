import { CacheInput, getCachedResource, resolveCachePolicy, setCachedResource } from './staleCache';

const DEFAULT_OFFLINE_FALLBACK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface LoadCachedQueryOptions<T> {
    key: string;
    policy?: CacheInput;
    forceFresh?: boolean;
    offlineFallbackTtlMs?: number;
    load: () => Promise<T>;
    onOfflineFallback?: (error: unknown) => void;
}

function buildOfflineFallbackPolicy(input: CacheInput, ttlMs: number) {
    const policy = resolveCachePolicy(input);

    return {
        ...policy,
        memoryTtlMs: Math.max(policy.memoryTtlMs, ttlMs),
        diskTtlMs: Math.max(policy.diskTtlMs, ttlMs),
    };
}

export async function loadCachedQuery<T>(options: LoadCachedQueryOptions<T>): Promise<T> {
    const policy = resolveCachePolicy(options.policy);

    if (!options.forceFresh) {
        const cached = await getCachedResource<T>(options.key, policy, { preserveExpired: true });
        if (cached) {
            return cached.data;
        }
    }

    try {
        const data = await options.load();
        await setCachedResource(options.key, data, policy);
        return data;
    } catch (error) {
        const fallback = await getCachedResource<T>(
            options.key,
            buildOfflineFallbackPolicy(policy, options.offlineFallbackTtlMs ?? DEFAULT_OFFLINE_FALLBACK_TTL_MS),
            { allowStale: true, preserveExpired: true }
        );

        if (fallback) {
            options.onOfflineFallback?.(error);
            return fallback.data;
        }

        throw error;
    }
}

import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until the user stops typing for `delay` ms.
 * Prevents triggering search/filter logic on every single keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 300);
 * // Only re-filter when user pauses typing for 300 ms
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

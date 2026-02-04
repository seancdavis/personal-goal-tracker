import { useState, useEffect, useCallback, useRef } from "react";

export interface UseAsyncDataOptions<T> {
  /** Dependencies that trigger a refetch when changed */
  deps?: unknown[];
  /** Whether to fetch immediately on mount (default: true) */
  immediate?: boolean;
  /** Initial data value */
  initialData?: T;
}

export interface UseAsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Refetch the data */
  refetch: () => Promise<void>;
  /** Set data directly (for optimistic updates) */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const { deps = [], immediate = true, initialData = null } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch, setData };
}

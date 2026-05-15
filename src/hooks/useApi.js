import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook.
 * @param {Function} apiFn   — async function returning an axios response
 * @param {*}        deps    — dependency array (re-fetches when changed)
 * @param {Object}   options — { immediate: bool, initialData: any }
 */
export function useApi(apiFn, deps = [], { immediate = true, initialData = null } = {}) {
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      if (mountedRef.current) setData(res.data);
      return { data: res.data, error: null };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Request failed';
      if (mountedRef.current) setError(msg);
      return { data: null, error: msg };
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute();
  }, [execute]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: execute };
}

/**
 * Mutation hook for POST/PUT/PATCH/DELETE operations.
 * Returns [mutate, { loading, error, data }]
 */
export function useMutation(apiFn) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      setData(res.data);
      return { data: res.data, error: null };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      setError(msg);
      return { data: null, error: msg };
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  return [mutate, { loading, error, data, clearError: () => setError(null) }];
}

/**
 * Paginated data hook.
 */
export function usePaginated(apiFn, initialParams = {}, deps = []) {
  const [params, setParams] = useState({ page: 0, size: 20, ...initialParams });
  const [items,  setItems]  = useState([]);
  const [total,  setTotal]  = useState(0);
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState(null);

  const fetch = useCallback(async (p = params) => {
    setLoading(true);
    try {
      const { data } = await apiFn(p);
      // Handle both paginated (Spring Page) and plain array responses
      if (data?.content) {
        setItems(data.content);
        setTotal(data.totalElements);
      } else if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(params); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage  = (page) => setParams(p => ({ ...p, page }));
  const setFilter = (key, val) => setParams(p => ({ ...p, [key]: val, page: 0 }));
  const refetch   = () => fetch(params);

  return { items, total, loading, error, params, goToPage, setFilter, refetch };
}

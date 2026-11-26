import { useEffect, useState } from 'react';
import { store } from './store';

/** Langganan real time ke satu koleksi. path=null → tidak berlangganan. */
export function useCol<T>(path: string | null, where?: [string, string]): { data: T[]; loading: boolean } {
  const key = path && where ? `${path}?${where[0]}=${where[1]}` : path;
  const [state, setState] = useState<{ data: T[]; loading: boolean; path: string | null }>({ data: [], loading: !!path, path: key });
  useEffect(() => {
    if (!path) {
      setState({ data: [], loading: false, path: key });
      return;
    }
    setState((s) => (s.path === key ? s : { data: [], loading: true, path: key }));
    return store.subscribe<T>(path, (rows) => setState({ data: rows, loading: false, path: key }), where);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data: state.path === key ? state.data : [], loading: state.path === key ? state.loading : true };
}

/** Langganan real time ke satu dokumen. */
export function useDocu<T>(path: string | null): { data: T | null; loading: boolean } {
  const [state, setState] = useState<{ data: T | null; loading: boolean; path: string | null }>({ data: null, loading: !!path, path });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, path });
      return;
    }
    setState((s) => (s.path === path ? s : { data: null, loading: true, path }));
    return store.subscribeDoc<T>(path, (d) => setState({ data: d, loading: false, path }));
  }, [path]);
  return { data: state.path === path ? state.data : null, loading: state.path === path ? state.loading : true };
}

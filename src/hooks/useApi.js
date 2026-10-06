import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/api';
import { useToast } from '../context/ToastContext';

export function useApi(path, params, { initial = [], enabled = true } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!!enabled && !!path);
  const [error, setError] = useState('');
  const key = JSON.stringify(params || {});
  const seq = useRef(0);
  const toast = useToast();

  const reload = useCallback(async () => {
    if (!enabled || !path) return;
    const my = ++seq.current;
    setLoading(true);
    try {
      const d = await api.get(path, params);
      if (my === seq.current) { setData(d ?? initial); setError(''); }
    } catch (e) {
      if (my === seq.current) {
        setError(e.message);
        if (e.status !== 401) toast.error('Could not load data', e.message);
      }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [path, key, enabled]);

  useEffect(() => { reload(); }, [reload]);

  return { data, setData, loading, error, reload };
}

export default useApi;

import { useCallback, useEffect, useState } from 'react';
import { listFeaturedProducts, listPublicProducts } from '../services/products';

export function usePublicProducts({ featuredOnly = false, limit = 3 } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = featuredOnly
        ? await listFeaturedProducts(limit)
        : await listPublicProducts();

      setProducts(result.data);
      setDemoMode(Boolean(result.demo));
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  }, [featuredOnly, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    products,
    loading,
    error,
    demoMode,
    reload: load,
  };
}

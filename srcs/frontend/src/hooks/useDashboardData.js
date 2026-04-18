import { useState, useEffect, useCallback } from 'react';
import { getDashboardView } from '../services/auraService.js';

const DEFAULT_CONTRACT_ID = 'WLT-2026-STU-00142';

/**
 * Hook to fetch and manage all dashboard data.
 * Handles loading, error, and success states.
 */
export function useDashboardData(contractId = DEFAULT_CONTRACT_ID) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardView(contractId);
      setData(result);
    } catch (err) {
      console.error('[useDashboardData]', err);
      setError(err.message || 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

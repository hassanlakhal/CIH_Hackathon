import { useState, useEffect, useCallback } from 'react';
import { getDashboardView } from '../services/auraService.js';
import { getAuraContractId } from '../utils/userIdentity.js';

/**
 * Hook to fetch and manage all dashboard data.
 * Reads the contract ID from localStorage ('aura_contract_id').
 * If no contract ID is stored, returns a noContract flag instead of
 * calling the backend with a fake/hardcoded value.
 */
export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noContract, setNoContract] = useState(false);

  const contractId = getAuraContractId();

  const fetchData = useCallback(async () => {
    if (!contractId) {
      setNoContract(true);
      setLoading(false);
      return;
    }

    setNoContract(false);
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardView(contractId);
      setData(result);
    } catch (err) {
      console.error('[useDashboardData]', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, noContract, refetch: fetchData };
}

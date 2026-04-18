import { useState, useEffect, useCallback } from 'react';
import { getWalletOperations } from '../services/walletService.js';
import { getAuraDecisionsFeed } from '../services/auraService.js';
import { transformOperationsForUI } from '../utils/transformApiData.js';

const DEFAULT_CONTRACT_ID = 'WLT-2026-STU-00142';

/**
 * Hook to fetch the full operations activity feed and Aura decisions.
 */
export function useActivityFeed(contractId = DEFAULT_CONTRACT_ID) {
  const [walletOps, setWalletOps] = useState([]);
  const [auraMoves, setAuraMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletRes, auraRes] = await Promise.all([
        getWalletOperations(contractId),
        getAuraDecisionsFeed()
      ]);
      setWalletOps(transformOperationsForUI(walletRes));
      setAuraMoves(auraRes);
    } catch (err) {
      console.error('[useActivityFeed]', err);
      setError(err.message || 'Failed to load activity history.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { walletOps, auraMoves, loading, error, refetch: fetchFeed };
}

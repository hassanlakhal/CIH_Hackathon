import { useState, useEffect, useCallback } from 'react';
import { getWalletOperations } from '../services/transactionService.js';
import { getAuraDecisionsFeed } from '../services/auraService.js';
import { transformOperationsForUI } from '../utils/transformApiData.js';
import { getAuraContractId } from '../utils/userIdentity.js';

/**
 * Hook to fetch the full operations activity feed and Aura decisions.
 * Reads the contract ID from localStorage ('aura_contract_id').
 * If no contract ID is stored, returns a noContract flag.
 */
export function useActivityFeed() {
  const [walletOps, setWalletOps] = useState([]);
  const [auraMoves, setAuraMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noContract, setNoContract] = useState(false);

  const contractId = getAuraContractId();

  const fetchFeed = useCallback(async () => {
    if (!contractId) {
      setNoContract(true);
      setLoading(false);
      return;
    }

    setNoContract(false);
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

  return { walletOps, auraMoves, loading, error, noContract, refetch: fetchFeed };
}

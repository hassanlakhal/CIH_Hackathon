import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWalletOperations } from '../../services/transactionService.js';
import { getAuraContractId } from '../../utils/userIdentity.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatRelativeTime } from '../../utils/formatDate.js';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function ActivityFeed() {
  const navigate = useNavigate();
  const [walletOps, setWalletOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noContract, setNoContract] = useState(false);

  useEffect(() => {
    const fetchFeed = async () => {
      const contractId = getAuraContractId();
      if (!contractId) {
        setNoContract(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await getWalletOperations(contractId);
        if (res?.result && Array.isArray(res.result)) {
            setWalletOps(res.result.filter(op => op.date && op.date !== '').sort((a, b) => new Date(b.date) - new Date(a.date)));
        }
      } catch (err) {
        setError('Failed to load activity history.');
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (loading) {
    return <LoadingState message="Loading activity..." />;
  }

  if (noContract) {
    return (
      <div className="px-5 py-12">
        <EmptyState
          icon="🪪"
          title="Wallet not activated yet"
          message="Complete onboarding to view your activity."
          actionLabel="Set up wallet"
          onAction={() => navigate('/onboarding')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-8">
        <EmptyState icon="⚠️" title="Error" message={error} actionLabel="Try again" onAction={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="px-4 pb-12 animate-slide-up">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="pt-3 mb-6">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Activity</h1>
        <p className="text-sm text-surface-500 mt-1 leading-relaxed max-w-xs">
          Your wallet transactions history
        </p>
      </div>

      {/* ─── Lists ──────────────────────────────────── */}
      {walletOps.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No transactions yet"
          message="Your incoming and outgoing transfers will appear here."
        />
      ) : (
        <div className="space-y-3">
          {walletOps.map((op, i) => {
            const isCredit = op.type === 'CASH_IN' || op.isTierCashIn;
            return (
              <div key={op.referenceId || i} className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-lg flex-shrink-0 shadow-sm border border-black/5">
                      {isCredit ? '📥' : '📤'}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-bold text-surface-900 truncate leading-tight">
                        {op.type || 'Transaction'}
                      </p>
                      <p className="text-xs text-surface-400 mt-1">{formatRelativeTime(new Date(op.date))}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className={`text-sm font-bold flex-shrink-0 ${isCredit ? 'text-success-600' : 'text-surface-900'}`}>
                      {isCredit ? '+ ' : ''}{formatCurrency(Math.abs(op.amount || 0))}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${op.status === 'CONFIRMED' ? 'bg-success-50 text-success-700' : 'bg-surface-100 text-surface-600'}`}>
                      {op.status === 'CONFIRMED' ? 'Completed' : op.status}
                    </span>
                  </div>
                </div>
                {op.beneficiaryFirstName && op.beneficiaryFirstName !== 'N/A' && (
                  <div className="pt-3 mt-1 border-t border-surface-100 flex items-center justify-between">
                    <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">
                      To: {op.beneficiaryFirstName} {op.beneficiaryLastName !== 'N/A' ? op.beneficiaryLastName : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

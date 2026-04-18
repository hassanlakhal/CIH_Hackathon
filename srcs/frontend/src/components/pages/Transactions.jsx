import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuraContractId } from '../../utils/userIdentity.js';
import { getWalletOperations } from '../../services/transactionService.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatRelativeTime } from '../../utils/formatDate.js';
import SectionCard from '../ui/SectionCard.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

const ACTIONS = [
  { id: 'cash-in', label: 'Cash In', icon: '📥', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'cash-out', label: 'Cash Out', icon: '📤', color: 'bg-blue-50 text-blue-600' },
  { id: 'wallet-to-wallet', label: 'Send to Wallet', icon: '📲', color: 'bg-accent-50 text-accent' },
  { id: 'transfer', label: 'Bank Transfer', icon: '🏦', color: 'bg-purple-50 text-purple-600' },
  { id: 'atm', label: 'ATM Withdraw', icon: '🏧', color: 'bg-orange-50 text-orange-600' },
  { id: 'wallet-to-merchant', label: 'Pay Merchant', icon: '🛒', color: 'bg-pink-50 text-pink-600' },
];

export default function Transactions() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noContract, setNoContract] = useState(false);

  const fetchHistory = async () => {
    const cid = getAuraContractId();
    if (!cid) {
      setNoContract(true);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await getWalletOperations(cid);
      if (res?.result && Array.isArray(res.result)) {
        setHistory(res.result.filter(op => op.date && op.date !== ''));
      }
    } catch (err) {
      console.error('[Transactions] error fetching operations:', err);
      // We don't block the whole page if history fails
      setError('Could not load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (noContract) {
    return (
      <div className="px-5 py-12">
        <EmptyState
          icon="🪪"
          title="Wallet not activated yet"
          message="Activate your wallet to make transactions."
          actionLabel="Set up wallet"
          onAction={() => navigate('/onboarding')}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-12 animate-fade-in">
      {/* ─── Actions Grid ──────────────────────────────────────── */}
      <h2 className="text-xl font-bold text-surface-900 mt-6 mb-4 px-1">Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(`/transactions/${action.id}`)}
            className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:border-primary-200 hover:shadow-md"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${action.color}`}>
              {action.icon}
            </div>
            <span className="text-sm font-semibold text-surface-800 text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* ─── History List ──────────────────────────────────────── */}
      <SectionCard
        title="Recent Transactions"
        actionLabel="Refresh"
        onAction={fetchHistory}
        className="mb-6"
      >
        {loading ? (
          <LoadingState message="Loading latest transactions..." />
        ) : error ? (
          <div className="text-center py-6 text-surface-500 text-sm">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-surface-500 text-sm">
            No transactions found.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {history.slice(0, 50).map((op, i) => {
              // Parse date (e.g. "04/05/2026 09:30:15 AM" or ISO)
              const d = new Date(op.date);
              const formattedDate = isNaN(d.getTime()) ? op.date : formatRelativeTime(d);
              // Basic logic to determine if it's a deposit or withdrawal based on type
              // W2M, ATM, CASH_OUT, TT (W2W out) are usually debits. CASH_IN is credit.
              const isCredit = op.type === 'CASH_IN' || op.isTierCashIn;
              const sign = isCredit ? '+' : '-';
              
              return (
                <div key={`${op.referenceId}-${i}`} className="flex items-center justify-between py-3 px-2 border-b border-surface-100 last:border-b-0 hover:bg-surface-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-lg flex-shrink-0">
                      {isCredit ? '📥' : '📤'}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-surface-900 text-sm leading-tight">
                        {op.type || 'Transaction'}
                      </span>
                      <span className="text-xs text-surface-500 mt-0.5">
                        {formattedDate} • {op.status === 'CONFIRMED' ? 'Confirmed' : op.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-bold text-sm ${isCredit ? 'text-success-600' : 'text-surface-900'}`}>
                      {sign} {formatCurrency(op.amount || 0)}
                    </span>
                    {op.beneficiaryFirstName && op.beneficiaryFirstName !== 'N/A' && (
                      <span className="text-xs text-surface-400 mt-0.5 max-w-[100px] truncate">
                        To {op.beneficiaryFirstName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

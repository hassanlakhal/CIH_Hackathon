import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityFeed } from '../../hooks/useActivityFeed.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { formatRelativeTime } from '../../utils/formatDate.js';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import TransferModal from '../ui/TransferModal.jsx';

const CATEGORY_CONFIG = {
  aura_save: { icon: '🌀', bg: 'bg-primary-50 text-primary', label: 'Aura Savings' },
  invisible_move: { icon: '🌀', bg: 'bg-primary-50 text-primary', label: 'Invisible Move' },
  income: { icon: '💰', bg: 'bg-success-50 text-success-600', label: 'Income' },
  shopping: { icon: '🛍️', bg: 'bg-warning-50 text-warning-600', label: 'Shopping' },
  housing: { icon: '🏠', bg: 'bg-blue-50 text-blue-600', label: 'Housing' },
  telecom: { icon: '📱', bg: 'bg-purple-50 text-purple-600', label: 'Telecom' },
  transport: { icon: '🚌', bg: 'bg-cyan-50 text-cyan-600', label: 'Transport' },
  other: { icon: '📋', bg: 'bg-surface-100 text-surface-600', label: 'Other' },
};

export default function ActivityFeed() {
  const { walletOps, auraMoves, loading, error, noContract, refetch } = useActivityFeed();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all'); // 'all' | 'wallet' | 'aura'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'completed' | 'simulated' | 'skipped'
  
  // TransferModal state
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('12');

  const allItems = useMemo(() => {
    const w = walletOps.map(op => ({ ...op, feedType: 'wallet' }));
    const a = auraMoves.map(m => ({ ...m, feedType: 'aura' }));
    return [...w, ...a].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [walletOps, auraMoves]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (tab === 'wallet' && item.feedType !== 'wallet') return false;
      if (tab === 'aura' && item.feedType !== 'aura') return false;
      
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      return true;
    });
  }, [allItems, tab, filterStatus]);

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
        <EmptyState icon="⚠️" title="Error" message={error} actionLabel="Try again" onAction={refetch} />
      </div>
    );
  }

  const handleExecuteTransfer = (amount) => {
    setTransferAmount(String(amount));
    setTransferModalOpen(true);
  };

  return (
    <>
      <div className="px-4 pb-12 animate-slide-up">
        {/* ─── Header ─────────────────────────────────── */}
        <div className="pt-3 mb-6">
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Activity</h1>
          <p className="text-sm text-surface-500 mt-1 leading-relaxed max-w-xs">
            See your wallet activity and Aura’s automatic savings decisions
          </p>
        </div>

        {/* ─── Segmented Tabs ─────────────────────────── */}
        <div className="flex bg-surface-100 p-1 rounded-xl mb-4 shadow-inner">
          {[
            { id: 'all', label: 'All' },
            { id: 'wallet', label: 'Wallet Operations' },
            { id: 'aura', label: 'Aura Moves' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Filters ────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'completed', label: 'Completed' },
            { id: 'simulated', label: 'Simulated' },
            { id: 'skipped', label: 'Skipped' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                filterStatus === f.id
                  ? 'bg-primary-dark border-primary-dark text-white shadow-sm'
                  : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ─── Lists ──────────────────────────────────── */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No results found"
            message="Try adjusting your filters or tabs above."
          />
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => {
              if (item.feedType === 'wallet') {
                return <WalletOperationCard key={`wallet-${item.id}`} op={item} />;
              }
              return <AuraDecisionCard key={`aura-${item.id}`} move={item} onExecute={() => handleExecuteTransfer(item.amount)} />;
            })}
          </div>
        )}
      </div>

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        amount={transferAmount}
        onSuccess={() => {
          // You could refetch here or display a toast
          refetch();
        }}
      />
    </>
  );
}

// ─── Subcomponents ──────────────────────────────
function WalletOperationCard({ op }) {
  const isCredit = op.type === 'credit';
  const config = CATEGORY_CONFIG[op.category] || CATEGORY_CONFIG.other;

  return (
    <div className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center text-lg flex-shrink-0 shadow-sm border border-black/5`}>
            {config.icon}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold text-surface-900 truncate leading-tight">{op.label}</p>
            <p className="text-xs text-surface-400 mt-1">{formatRelativeTime(op.date)}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1.5">
          <span className={`text-sm font-bold flex-shrink-0 ${isCredit ? 'text-success-600' : 'text-surface-900'}`}>
            {isCredit ? '+ ' : ''}{formatCurrency(Math.abs(op.amount))}
          </span>
          <StatusBadge status={op.status === 'completed' ? 'completed' : 'pending'} label={op.status} />
        </div>
      </div>
      {(op.reference || (!isCredit && op.category !== 'other')) && (
        <div className="pt-3 mt-1 border-t border-surface-100 flex items-center justify-between">
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Ref: {op.reference || 'N/A'}</span>
          <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">{op.type}</span>
        </div>
      )}
    </div>
  );
}

function AuraDecisionCard({ move, onExecute }) {
  let bgClass = "bg-white border-surface-200";
  let icon = "🌀";
  let badgeVariant = "active";
  
  if (move.status === 'skipped') {
    bgClass = "bg-warning-50/50 border-warning-100";
    icon = "⚠️";
    badgeVariant = "failed";
  } else if (move.status === 'simulated') {
    bgClass = "bg-primary-50/50 border-primary-100";
    icon = "🧠";
    badgeVariant = "pending";
  } else if (move.status === 'completed') {
    bgClass = "bg-success-50/50 border-success-100";
    icon = "✅";
    badgeVariant = "completed";
  }

  return (
    <div className={`card p-4 border transition-shadow hover:shadow-md ${bgClass}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-surface-100 text-sm">
            {icon}
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-surface-400">Aura Decision</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-surface-900">
            {formatCurrency(Math.abs(move.amount))}
          </span>
          <StatusBadge status={badgeVariant} label={move.status} />
        </div>
      </div>
      
      <div className="mt-2 pl-10">
        <h3 className="text-sm font-bold text-surface-900 tracking-tight leading-tight mb-1.5">
          {move.reason}
        </h3>
        {move.explanation && (
          <p className="text-xs text-surface-600 leading-relaxed max-w-[90%]">
            {move.explanation}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between pt-3 mt-3 border-t border-surface-200/50">
        <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400">{formatRelativeTime(move.date)}</span>
        
        {move.status === 'simulated' && onExecute && (
          <button 
            onClick={onExecute}
            className="px-3 py-1.5 bg-primary-dark text-white text-xs font-bold rounded-lg shadow-sm hover:brightness-110 transition-all text-center"
          >
            Execute Transfer
          </button>
        )}
      </div>
    </div>
  );
}

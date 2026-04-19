/**
 * Dashboard — main landing page showing savings summary,
 * goal progress, predicted expenses, and recent invisible moves.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../../hooks/useDashboardData.js';
import { getClientInfo } from '../../services/walletService.js';
import { getWalletBalance } from '../../services/transactionService.js';
import { getStoredUserIdentity, updateStoredUserIdentity, getAuraContractId, setAuraContractId } from '../../utils/userIdentity.js';
import { formatCurrency, formatCurrencyCompact } from '../../utils/formatCurrency.js';
import { formatRelativeTime, formatDate } from '../../utils/formatDate.js';
import StatCard from '../ui/StatCard.jsx';
import SectionCard from '../ui/SectionCard.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import PrimaryButton from '../ui/PrimaryButton.jsx';

export default function Dashboard() {
  const { data, loading, error, noContract, refetch } = useDashboardData();
  const navigate = useNavigate();

  const [realBalance, setRealBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(null);

  // Client info state
  const [clientInfo, setClientInfo] = useState(null);
  const [clientInfoLoading, setClientInfoLoading] = useState(true);

  // ─── Fetch real wallet balance ────────────────────────
  useEffect(() => {
    const cid = getAuraContractId();
    if (!cid) {
      setBalanceError('Activate wallet');
      setBalanceLoading(false);
      return;
    }
    
    setBalanceLoading(true);
    setBalanceError(null);
    getWalletBalance(cid)
      .then(res => {
        if (res?.result?.balance?.[0]?.value) {
          const rawValue = res.result.balance[0].value;
          const numericVal = parseFloat(rawValue.replace(',', '.'));
          setRealBalance(numericVal);
        } else {
          setBalanceError('Unavailable');
        }
      })
      .catch(() => {
        setBalanceError('Disconnected');
      })
      .finally(() => {
        setBalanceLoading(false);
      });
  }, []);

  // ─── Fetch client info ────────────────────────────────
  useEffect(() => {
    const identity = getStoredUserIdentity();
    if (!identity?.phoneNumber || !identity?.identificationType || !identity?.identificationNumber) {
      setClientInfoLoading(false);
      return;
    }

    setClientInfoLoading(true);
    getClientInfo({
      phoneNumber: identity.phoneNumber,
      identificationType: identity.identificationType,
      identificationNumber: identity.identificationNumber,
    })
      .then(res => {
        if (res?.result) {
          setClientInfo(res.result);
          // Sync contractId/rib from products[0] if not already stored
          const product = res.result.products?.[0];
          if (product) {
            const updates = {};
            if (product.contractId && !identity.contractId) {
              updates.contractId = product.contractId;
              setAuraContractId(product.contractId);
            }
            if (product.rib && !identity.rib) {
              updates.rib = product.rib;
              localStorage.setItem('aura_rib', product.rib);
            }
            if (Object.keys(updates).length > 0) {
              updateStoredUserIdentity(updates);
            }
          }
        }
      })
      .catch(err => {
        console.warn('[Dashboard] clientInfo fetch failed:', err);
      })
      .finally(() => {
        setClientInfoLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingState message="Preparing your dashboard…" />;
  }

  // ─── No contract ID → onboarding CTA ─────────────────
  if (noContract) {
    return (
      <div className="px-5 py-12">
        <EmptyState
          icon="🪪"
          title="Wallet not activated yet"
          message="Complete onboarding to view your account data and start saving."
          actionLabel="Set up wallet"
          onAction={() => navigate('/onboarding')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-8">
        <EmptyState
          icon="⚠️"
          title="Loading Error"
          message={error}
          actionLabel="Try again"
          onAction={refetch}
        />
      </div>
    );
  }

  const { metrics, invisibleMoves, predictions, settings } = data;

  // Derive display name from client info or stored identity
  const identity = getStoredUserIdentity();
  const displayName = clientInfo
    ? `${clientInfo.tierFirstName || ''} ${clientInfo.tierLastName || ''}`.trim()
    : identity
      ? `${identity.firstName || ''} ${identity.lastName || ''}`.trim()
      : '';

  return (
    <div className="px-4 space-y-5 animate-slide-up">
      {/* ─── Greeting ─────────────────────────────────── */}
      <div className="pt-2">
        <p className="text-surface-400 text-sm font-medium">
          Hello{displayName ? `, ${displayName}` : ''} 👋
        </p>
        <p className="text-xs text-surface-300 mt-0.5">
          Aura is working in the background for you.
        </p>
      </div>

      {/* ─── Client info card ─────────────────────────── */}
      {clientInfo && (
        <div className="card p-4 border border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-lg">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 truncate">
                {displayName || 'Account holder'}
              </p>
              <p className="text-xs text-surface-400 truncate">
                {clientInfo.phoneNumber || ''}{clientInfo.products?.[0]?.provider ? ` · ${clientInfo.products[0].provider.trim()}` : ''}
              </p>
            </div>
            {clientInfo.products?.[0]?.name && (
              <span className="text-[10px] font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded-md uppercase tracking-wide flex-shrink-0">
                {clientInfo.products[0].name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── Savings goal card ─────────────────────── */}
      <div className="card p-5 bg-gradient-primary border-0 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-24 h-24 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <p className="text-primary-100 text-xs font-semibold uppercase tracking-wider mb-1">
            Total Saved
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatCurrency(metrics.totalSaved, metrics.currency)}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs bg-white/15 px-2 py-0.5 rounded-md font-medium">
              Goal : {formatCurrencyCompact(metrics.savingsGoal)}
            </span>
          </div>

          {/* Goal progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-primary-100">Progress</span>
              <span className="text-white font-semibold">
                {Math.round(metrics.goalProgress * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, metrics.goalProgress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Top summary grid ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 space-y-1 relative border border-surface-200">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-widest">
              Current Balance
            </p>
            <span className="text-lg">💳</span>
          </div>
          {balanceLoading ? (
            <div className="h-7 w-24 bg-surface-200 animate-pulse rounded mt-1" />
          ) : balanceError ? (
            <p className="text-xs text-danger-500 font-medium leading-tight mt-1">
              {balanceError}
            </p>
          ) : (
            <p className="text-2xl font-black text-surface-900 tracking-tight mt-1">
              {formatCurrency(realBalance ?? 0)}
            </p>
          )}
        </div>
        <StatCard
          label="Safety Floor"
          value={formatCurrency(metrics.safetyFloor)}
          icon="🛡️"
          subtitle="Protected amount"
        />
        <StatCard
          label="Safe to Save"
          value={formatCurrency(metrics.safeToSave)}
          icon="✨"
          subtitle="Available for saving"
          trend={metrics.safeToSave > 100 ? 'up' : 'down'}
          trendLabel={metrics.safeToSave > 100 ? 'Good' : 'Low'}
        />
        <StatCard
          label="This month"
          value={`${invisibleMoves.length}`}
          icon="🔄"
          subtitle="Invisible moves"
        />
      </div>

      {/* ─── Recent invisible moves ───────────────────── */}
      <SectionCard
        title="Recent Invisible Moves"
        action="View full activity"
        onAction={() => navigate('/activity')}
      >
        {invisibleMoves.length === 0 ? (
          <EmptyState
            icon="🌙"
            title="No recent moves"
            message="Aura will start saving automatically as soon as possible."
          />
        ) : (
          <div className="space-y-2.5">
            {invisibleMoves.slice(0, 3).map((move) => (
              <div
                key={move.id}
                className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-base">
                    🌀
                  </div>
                  <div>
                     <p className="text-sm font-medium text-surface-800 leading-tight">
                       {/* Hardcoding generic label for the view instead of api parse to ensure formatting */}
                       Invisible savings
                     </p>
                    <p className="text-xs text-surface-400">
                      {formatRelativeTime(move.date)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary-dark">
                  {formatCurrency(Math.abs(move.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ─── Predicted recurring expenses ───────────────────────── */}
      <SectionCard title="Predicted recurring expenses">
        {predictions && predictions.length > 0 ? (
          <div className="space-y-2.5">
            {predictions.map((pred) => (
              <div
                key={pred.id}
                className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-warning-50 flex items-center justify-center text-base">
                    📅
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-800 leading-tight">
                      {pred.label}
                    </p>
                    <p className="text-xs text-surface-400">
                      Expected {formatDate(pred.dueDate, { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-surface-700">
                  {formatCurrency(pred.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🔮"
            title="No predictions yet"
            message="Predictions will appear here with more history."
          />
        )}
      </SectionCard>

      {/* ─── CTA section ───────────────────────── */}
      <div className="pb-4">
        <PrimaryButton
          fullWidth
          variant="secondary"
          onClick={() => navigate('/settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Update settings
        </PrimaryButton>
      </div>
    </div>
  );
}

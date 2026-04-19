/**
 * Dashboard — Minimized accueil page with:
 * - User info & balance
 * - Saving account overview
 * - AI Insights (auto-generated on connect)
 * - Quick actions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientInfo } from '../../services/walletService.js';
import { getWalletBalance } from '../../services/transactionService.js';
import { triggerInsight, getInsight, getWalletSettings } from '../../services/walletService.js';
import { getStoredUserIdentity, updateStoredUserIdentity, getAuraContractId, setAuraContractId } from '../../utils/userIdentity.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import PrimaryButton from '../ui/PrimaryButton.jsx';

function ScoreBadge({ score, delta }) {
  const color = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : score >= 60 ? 'text-sky-600 bg-sky-50 border-sky-200'
    : score >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${color} font-bold text-xs`}>
      <span>{score}/100</span>
      {delta !== 0 && (
        <span className={`${delta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const identity = getStoredUserIdentity();
  const token = identity?.token;

  const [realBalance, setRealBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [clientInfoLoading, setClientInfoLoading] = useState(true);

  // Insight state
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Saving account state
  const [savingBalance, setSavingBalance] = useState(0);
  const [settings, setSettings] = useState(null);

  // ─── Fetch real wallet balance ────────────────────────
  useEffect(() => {
    const cid = getAuraContractId();
    if (!cid) {
      setBalanceLoading(false);
      return;
    }
    setBalanceLoading(true);
    getWalletBalance(cid)
      .then(res => {
        if (res?.result?.balance?.[0]?.value) {
          const rawValue = res.result.balance[0].value;
          setRealBalance(parseFloat(rawValue.replace(',', '.')));
        }
      })
      .catch(() => {})
      .finally(() => setBalanceLoading(false));
  }, []);

  // ─── Fetch client info ────────────────────────────────
  useEffect(() => {
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
      .catch(() => {})
      .finally(() => setClientInfoLoading(false));
  }, []);

  // ─── Auto-fetch insight on connect ────────────────────
  useEffect(() => {
    if (!token) { setInsightLoading(false); return; }

    // Fetch wallet settings first for saving balance
    getWalletSettings(token)
      .then(res => {
        if (res) {
          setSettings(res);
          if (res.savingAccountBalance) {
            setSavingBalance(parseFloat(res.savingAccountBalance));
          }
        }
      })
      .catch(() => {});

    // Try to load existing insight
    getInsight(token)
      .then(res => {
        if (res?.result?.insight) {
          setInsight(res.result.insight);
        } else {
          // Auto-generate insight if none exists
          return triggerInsight(token).then(genRes => {
            if (genRes?.result?.insight) {
              setInsight(genRes.result.insight);
            }
          });
        }
      })
      .catch(() => {})
      .finally(() => setInsightLoading(false));
  }, [token]);

  const handleRefreshInsight = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const res = await triggerInsight(token);
      if (res?.result?.survey_required) {
        navigate('/survey');
        return;
      }
      if (res?.result?.insight) {
        setInsight(res.result.insight);
      }
    } catch {}
    setGenerating(false);
  };

  // No contract → onboarding
  const cid = getAuraContractId();
  if (!cid) {
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

  const displayName = clientInfo
    ? `${clientInfo.tierFirstName || ''} ${clientInfo.tierLastName || ''}`.trim()
    : identity
      ? `${identity.firstName || ''} ${identity.lastName || ''}`.trim()
      : '';

  return (
    <div className="px-4 space-y-4 animate-slide-up pb-6">
      {/* ─── Greeting ───────────────────────────── */}
      <div className="pt-2">
        <p className="text-surface-400 text-sm font-medium">
          Hello{displayName ? `, ${displayName}` : ''} 👋
        </p>
        <p className="text-xs text-surface-300 mt-0.5">
          Mind Save is working for you.
        </p>
      </div>

      {/* ─── User Info Card ─────────────────────── */}
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

      {/* ─── Balance Cards ──────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Main Balance */}
        <div className="card p-4 bg-gradient-primary border-0 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full" />
          <p className="text-primary-100 text-[10px] font-semibold uppercase tracking-widest mb-1">
            Balance
          </p>
          {balanceLoading ? (
            <div className="h-7 w-20 bg-white/20 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-xl font-black tracking-tight">
              {formatCurrency(realBalance ?? 0)}
            </p>
          )}
          <p className="text-primary-100 text-[10px] mt-1">💳 Main wallet</p>
        </div>

        {/* Saving Account Balance */}
        <div className="card p-4 border border-emerald-200 bg-emerald-50 relative overflow-hidden cursor-pointer hover:bg-emerald-100 transition-colors"
          onClick={() => navigate('/saving-account')}>
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-200/30 rounded-full" />
          <p className="text-emerald-700 text-[10px] font-semibold uppercase tracking-widest mb-1">
            Savings
          </p>
          <p className="text-xl font-black text-emerald-800 tracking-tight">
            {formatCurrency(savingBalance)}
          </p>
          <p className="text-emerald-600 text-[10px] mt-1">🏦 Saving account →</p>
        </div>
      </div>

      {/* ─── Quick Actions ──────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/transactions')}
          className="flex-1 card p-3 border border-surface-200 flex items-center justify-center gap-2 hover:bg-surface-50 transition-colors"
        >
          <span className="text-base">💸</span>
          <span className="text-xs font-semibold text-surface-700">Transfer</span>
        </button>
        <button
          onClick={() => navigate('/saving-account')}
          className="flex-1 card p-3 border border-emerald-200 bg-emerald-50 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
        >
          <span className="text-base">🏦</span>
          <span className="text-xs font-semibold text-emerald-700">Save Now</span>
        </button>
        <button
          onClick={() => navigate('/goals')}
          className="flex-1 card p-3 border border-surface-200 flex items-center justify-center gap-2 hover:bg-surface-50 transition-colors"
        >
          <span className="text-base">🎯</span>
          <span className="text-xs font-semibold text-surface-700">Goals</span>
        </button>
      </div>

      {/* ─── AI Insights (merged) ───────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <h2 className="text-sm font-bold text-surface-900">AI Insights</h2>
          </div>
          <button
            onClick={handleRefreshInsight}
            disabled={generating}
            className="text-[10px] font-bold text-primary bg-primary-50 px-2.5 py-1 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
          >
            {generating ? '⏳ Analyzing…' : '🔄 Refresh'}
          </button>
        </div>

        {insightLoading ? (
          <div className="card p-6 border border-surface-200">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-surface-400 font-medium">Generating your insights…</p>
            </div>
          </div>
        ) : !insight ? (
          <div className="card p-5 border border-dashed border-surface-300 text-center">
            <p className="text-2xl mb-2">🧠</p>
            <p className="text-sm font-semibold text-surface-700">No insights yet</p>
            <p className="text-xs text-surface-400 mt-1 mb-3">Generate your first AI analysis</p>
            <PrimaryButton onClick={handleRefreshInsight} loading={generating} className="text-xs !px-4 !py-2">
              ✨ Generate Insight
            </PrimaryButton>
          </div>
        ) : (
          <div className="space-y-3">
            {/* AI Summary */}
            <div className="card p-4 bg-gradient-to-br from-surface-800 to-surface-900 text-white border-0 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-bold text-surface-200 flex-1">AI Summary</h3>
                  <ScoreBadge score={insight.health_score} delta={insight.health_score_delta} />
                </div>
                <p className="text-sm leading-relaxed text-surface-100">{insight.summary_message}</p>
                {insight.warning && (
                  <div className="mt-2 bg-red-500/20 border border-red-400/30 rounded-lg p-2 text-xs text-red-200 font-medium">
                    {insight.warning}
                  </div>
                )}
              </div>
            </div>

            {/* Tip */}
            {insight.tip && (
              <div className="card p-3 bg-primary-50 border border-primary-200">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-[10px] font-bold text-primary-800 uppercase tracking-wide mb-0.5">AI Tip</p>
                    <p className="text-xs text-primary-700 leading-relaxed">{insight.tip}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Saving Account Detail Summary */}
            {settings && settings.sendToSavingAccount && (
              <div className="card p-4 border border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🤖</span>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Auto-Saving Active</h4>
                    <p className="text-[10px] text-emerald-600">Your savings are protected</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-2 border border-emerald-100/50">
                    <p className="text-[10px] text-emerald-600 font-semibold mb-0.5">Monthly Safe</p>
                    <p className="text-sm font-bold text-emerald-900">
                      {formatCurrency(parseFloat(settings.monthlySavingAmount || 0))}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2 border border-emerald-100/50">
                    <p className="text-[10px] text-emerald-600 font-semibold mb-0.5">Trigger Limit</p>
                    <p className="text-sm font-bold text-emerald-900">
                      {formatCurrency(parseFloat(settings.savingTriggerBalance || 0))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

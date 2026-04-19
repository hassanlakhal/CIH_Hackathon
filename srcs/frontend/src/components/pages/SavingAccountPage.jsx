/**
 * SavingAccountPage — Full saving account management page.
 * Shows saving balance, transfer history, manual deposit/withdraw.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWalletSettings, getSavingAccountHistory, transferToSavingAccount } from '../../services/walletService.js';
import { getWalletBalance } from '../../services/transactionService.js';
import { getStoredUserIdentity, getAuraContractId } from '../../utils/userIdentity.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import PrimaryButton from '../ui/PrimaryButton.jsx';
import LoadingState from '../ui/LoadingState.jsx';

export default function SavingAccountPage() {
  const identity = getStoredUserIdentity();
  const token = identity?.token;
  const navigate = useNavigate();

  const [savingBalance, setSavingBalance] = useState(0);
  const [mainBalance, setMainBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ amount: '', direction: 'deposit' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchData = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [settingsRes, historyRes] = await Promise.all([
        getWalletSettings(token).catch(() => null),
        getSavingAccountHistory(token).catch(() => null),
      ]);

      if (settingsRes) {
        setSettings(settingsRes);
        setSavingBalance(parseFloat(settingsRes.savingAccountBalance || '0'));
      }
      if (historyRes?.result) {
        setSavingBalance(parseFloat(historyRes.result.savingAccountBalance || '0'));
        setMainBalance(parseFloat(historyRes.result.balance || '0'));
        setHistory(historyRes.result.history || []);
      }

      // Also get live balance
      const cid = getAuraContractId();
      if (cid) {
        const balRes = await getWalletBalance(cid).catch(() => null);
        if (balRes?.result?.balance?.[0]?.value) {
          setMainBalance(parseFloat(balRes.result.balance[0].value.replace(',', '.')));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleTransfer = async () => {
    const amount = parseFloat(transferForm.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setTransferring(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await transferToSavingAccount({
        token,
        amount,
        direction: transferForm.direction,
      });
      if (res?.result) {
        setSavingBalance(parseFloat(res.result.savingAccountBalance));
        setMainBalance(parseFloat(res.result.balance));
        setSuccess(`${transferForm.direction === 'deposit' ? 'Deposited' : 'Withdrawn'} ${formatCurrency(amount)} successfully!`);
        setShowModal(false);
        setTransferForm({ amount: '', direction: 'deposit' });
        fetchData(); // Refresh history
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) return <LoadingState message="Loading saving account…" />;

  const isAutoEnabled = settings?.sendToSavingAccount;
  const monthlyAmount = parseFloat(settings?.monthlySavingAmount || '0');
  const triggerBalance = parseFloat(settings?.savingTriggerBalance || '0');

  return (
    <div className="px-4 pb-8 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-surface-900">Saving Account</h1>
        <p className="text-xs text-surface-400 mt-0.5">Your automated savings vault</p>
      </div>

      {/* Success / Error messages */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm font-semibold flex items-center justify-between">
          ✅ {success}
          <button onClick={() => setSuccess(null)} className="text-emerald-500 p-1">✕</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-semibold flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-500 p-1">✕</button>
        </div>
      )}

      {/* Saving Balance Hero Card */}
      <div className="card p-6 bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
            Saving Account Balance
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatCurrency(savingBalance)}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs bg-white/15 px-2 py-0.5 rounded-md font-medium">
              🏦 Protected savings
            </span>
            {isAutoEnabled && (
              <span className="text-xs bg-white/15 px-2 py-0.5 rounded-md font-medium">
                🤖 Auto-save ON
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Balances Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3 border border-surface-200">
          <p className="text-[10px] font-semibold text-surface-500 uppercase">Main Balance</p>
          <p className="text-lg font-black text-surface-900 mt-0.5">{formatCurrency(mainBalance)}</p>
        </div>
        <div className="card p-3 border border-emerald-200 bg-emerald-50">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">Total Savings</p>
          <p className="text-lg font-black text-emerald-800 mt-0.5">{formatCurrency(savingBalance)}</p>
        </div>
      </div>

      {/* Auto-Save Settings Card */}
      <div className="card p-4 border border-surface-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-base border border-blue-100">
            🤖
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-900">Auto-Save Settings</p>
            <p className="text-[10px] text-surface-400">Configure in Settings</p>
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isAutoEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-200 text-surface-500'}`}>
            {isAutoEnabled ? 'ACTIVE' : 'OFF'}
          </div>
        </div>
        {isAutoEnabled && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100">
            <div>
              <p className="text-[10px] text-surface-400">Monthly Amount</p>
              <p className="text-sm font-bold text-surface-900">{formatCurrency(monthlyAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-surface-400">Trigger Balance</p>
              <p className="text-sm font-bold text-surface-900">{formatCurrency(triggerBalance)}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => navigate('/settings')}
          className="w-full mt-3 text-xs font-semibold text-primary py-2 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors"
        >
          ⚙️ Configure Auto-Save
        </button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3">
        <PrimaryButton
          fullWidth
          variant="secondary"
          onClick={() => { setTransferForm({ amount: '', direction: 'withdraw' }); setShowModal(true); }}
          className="!py-3 border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
        >
          <span className="mr-1">⬇️</span> Withdraw to Wallet
        </PrimaryButton>
      </div>

      {/* Transfer History */}
      <div>
        <h2 className="text-sm font-bold text-surface-900 mb-3">Transfer History</h2>
        {history.length === 0 ? (
          <div className="card p-5 border border-dashed border-surface-300 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm font-semibold text-surface-700">No transfers yet</p>
            <p className="text-xs text-surface-400 mt-1">Your saving account transfers will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((t) => (
              <div key={t.id} className="card p-3 flex items-center gap-3 border border-surface-200">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border ${t.type === 'deposit' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
                  }`}>
                  {t.type === 'deposit' ? '⬆️' : '⬇️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900">
                    {t.type === 'deposit' ? 'Deposit to savings' : 'Withdrawal from savings'}
                  </p>
                  <p className="text-[10px] text-surface-400">
                    {new Date(t.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className={`text-sm font-bold ${t.type === 'deposit' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {t.type === 'deposit' ? '+' : '-'}{formatCurrency(parseFloat(t.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end animate-fade-in">
          <div className="w-full bg-white rounded-t-3xl p-5 pb-safe animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">
                {transferForm.direction === 'deposit' ? '⬆️ Deposit to Savings' : '⬇️ Withdraw from Savings'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-surface-500">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Amount (MAD)</label>
                <input
                  type="number"
                  value={transferForm.amount}
                  onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Enter amount"
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                />
              </div>

              <div className="bg-surface-50 rounded-xl p-3">
                <div className="flex justify-between text-xs text-surface-500 mb-1">
                  <span>Available {transferForm.direction === 'deposit' ? 'in wallet' : 'in savings'}</span>
                  <span className="font-bold text-surface-900">
                    {formatCurrency(transferForm.direction === 'deposit' ? mainBalance : savingBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <PrimaryButton
                fullWidth
                loading={transferring}
                onClick={handleTransfer}
                disabled={!transferForm.amount || parseFloat(transferForm.amount) <= 0}
              >
                {transferForm.direction === 'deposit' ? 'Deposit to Savings' : 'Withdraw to Wallet'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

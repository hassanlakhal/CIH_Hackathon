import { useState, useEffect } from 'react';
import { getWalletSettings, updateWalletSettings } from '../../services/walletService.js';
import { getStoredUserIdentity } from '../../utils/userIdentity.js';
import SectionCard from '../ui/SectionCard.jsx';
import PrimaryButton from '../ui/PrimaryButton.jsx';
import LoadingState from '../ui/LoadingState.jsx';

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-surface-100 last:border-0">
      <div className="flex-1 mr-4">
        <p className="text-sm font-bold text-surface-900">{label}</p>
        {description && (
          <p className="text-xs text-surface-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? 'bg-primary-800' : 'bg-surface-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function NumberInputRow({ label, value, onChange, unit = 'MAD' }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-surface-100 last:border-0 gap-4">
      <p className="text-sm font-bold text-surface-900 flex-1">{label}</p>
      <div className="relative w-32">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-50 border border-surface-200 rounded-lg py-1.5 pl-3 pr-10 text-right text-sm font-bold text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow appearance-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-surface-400">
          {unit}
        </span>
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const identity = getStoredUserIdentity();
      if (!identity?.token) return;
      try {
        const s = await getWalletSettings(identity.token);
        setSettings({
          safetyFloor: s.safetyFloor || 0,
          monthlySavingAmount: s.monthlySavingAmount || 0,
          savingTriggerBalance: s.savingTriggerBalance || 0,
          sendToSavingAccount: s.sendToSavingAccount ?? false,
        });
      } catch (err) {
        console.error('Failed to load settings', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleTextChange = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    const floor = parseFloat(settings.safetyFloor);
    const amount = parseFloat(settings.monthlySavingAmount);
    const trigger = parseFloat(settings.savingTriggerBalance);

    if (isNaN(floor) || floor < 0) {
      setError('Safety floor must be a valid positive number.');
      return;
    }
    if (isNaN(amount) || amount < 0) {
      setError('Monthly saving amount must be a positive number.');
      return;
    }

    setSaving(true);
    const identity = getStoredUserIdentity();
    await updateWalletSettings({
      token: identity.token,
      safetyFloor: floor,
      monthlySavingAmount: amount,
      savingTriggerBalance: trigger,
      sendToSavingAccount: settings.sendToSavingAccount,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <LoadingState message="Loading preferences..." />;
  }

  return (
    <div className="px-4 pb-12 animate-slide-up">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="pt-3 mb-6">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Settings</h1>
        <p className="text-sm text-surface-500 mt-1 leading-relaxed max-w-[280px]">
          Stay in control of how Aura manages your savings experience
        </p>
      </div>

      {/* ─── Settings Form ──────────────────────────── */}
      <div className="mb-6">
        <SectionCard title="Preferences">
          <NumberInputRow
            label="Safety Floor"
            value={settings.safetyFloor}
            onChange={(val) => handleTextChange('safetyFloor', val)}
          />
          <NumberInputRow
            label="Monthly Savings Amount"
            value={settings.monthlySavingAmount}
            onChange={(val) => handleTextChange('monthlySavingAmount', val)}
          />
          <NumberInputRow
            label="Saving Trigger Balance"
            value={settings.savingTriggerBalance}
            onChange={(val) => handleTextChange('savingTriggerBalance', val)}
          />
          <ToggleRow
            label="Enable Auto-Save Account"
            description="Allow system to move funds to your saving account when reaching the trigger balance."
            checked={settings.sendToSavingAccount}
            onChange={() => toggle('sendToSavingAccount')}
          />
        </SectionCard>
      </div>

      {error && (
        <div className="mb-4 bg-danger-50 border border-danger-200 text-danger-700 text-sm p-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* ─── Information Card ───────────────────────── */}
      <div className="card p-5 bg-gradient-to-br from-surface-50 to-surface-100 border border-surface-200 mb-8 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-6xl opacity-[0.03]">🌀</div>
        <h2 className="text-base font-bold text-surface-900 mb-3 flex items-center gap-2">
          <span>ℹ️</span> How Aura Works
        </h2>
        
        <div className="space-y-4 text-sm text-surface-600 leading-relaxed">
          <div>
            <span className="font-bold text-surface-900">Safety Floor: </span>
            Aura never touches your money if your Wallet Balance falls below this limit. This guarantees you always have enough available for your daily needs.
          </div>
          <div>
            <span className="font-bold text-surface-900">Smart Decisions: </span>
            Using your transaction history, Aura detects standard spending routines. If an upcoming expense (like rent) is near, Aura suppresses moves.
          </div>
          <div className="flex items-start gap-2 bg-primary-50 p-3 rounded-lg border border-primary-100 text-primary-800">
            <span className="text-lg">🧪</span>
            <span className="text-xs font-bold leading-relaxed">
              Current transfers are operating in "simulation-first mode". Aura tracks decisions, but no real money moves until final integration.
            </span>
          </div>
        </div>
      </div>

      {/* ─── Save button ──────────────────────────────── */}
      <div className="pb-4">
        <PrimaryButton
          fullWidth
          onClick={handleSave}
          loading={saving}
          disabled={saving || saved}
        >
          {saved ? '✓ Saved Successfully' : 'Save Changes'}
        </PrimaryButton>
      </div>
    </div>
  );
}

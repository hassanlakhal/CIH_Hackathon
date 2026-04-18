import { useState, useEffect } from 'react';
import { getAuraSettings, updateAuraSettings } from '../../services/auraService.js';
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
      const s = await getAuraSettings();
      setSettings({
        safetyFloor: s.safetyFloor || 200,
        savingsGoal: s.savingsGoal || 5000,
        savingsEnabled: s.savingsEnabled ?? true,
        notificationsEnabled: s.notificationsEnabled ?? true,
      });
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
    // Basic validation
    const floor = parseFloat(settings.safetyFloor);
    const goal = parseFloat(settings.savingsGoal);

    if (isNaN(floor) || floor < 0) {
      setError('Safety floor must be a valid positive number.');
      return;
    }
    if (isNaN(goal) || goal <= 0) {
      setError('Savings goal must be a valid positive number greater than 0.');
      return;
    }

    setSaving(true);
    await updateAuraSettings({
      ...settings,
      safetyFloor: floor,
      savingsGoal: goal,
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
            label="Monthly Savings Goal"
            value={settings.savingsGoal}
            onChange={(val) => handleTextChange('savingsGoal', val)}
          />
          <ToggleRow
            label="Automatic Invisible Moves"
            description="Allow Aura to detect save-able micro amounts and move them automatically."
            checked={settings.savingsEnabled}
            onChange={() => toggle('savingsEnabled')}
          />
          <ToggleRow
            label="Transparency Notifications"
            description="Get notified whenever Aura simulates or completes a move on your behalf."
            checked={settings.notificationsEnabled}
            onChange={() => toggle('notificationsEnabled')}
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

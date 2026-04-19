/**
 * GoalsPage — Savings Goals Manager
 * Create, track, and manage savings goals with auto-save rules.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoals, createGoal, updateGoal, getAutoSaveRules, createAutoSaveRule } from '../../services/walletService.js';
import { getStoredUserIdentity } from '../../utils/userIdentity.js';
import PrimaryButton from '../ui/PrimaryButton.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const PRIORITY_COLORS = {
  HIGH: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  LOW: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
};

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-success-100 text-success-600' },
  ACHIEVED: { label: '🎉 Achieved', color: 'bg-primary-100 text-primary-700' },
  PAUSED: { label: 'Paused', color: 'bg-surface-200 text-surface-600' },
};

const RULE_TYPE_LABELS = {
  ROUND_UP: { icon: '🔄', label: 'Round Up', desc: 'Round up every transaction' },
  PERCENT_INCOME: { icon: '📊', label: 'Percent of Income', desc: 'Save % of every income' },
  FIXED_MONTHLY: { icon: '📌', label: 'Fixed Monthly', desc: 'Save fixed amount monthly' },
};

function GoalProgressRing({ progress, size = 64, stroke = 5 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(1, progress) * circumference;
  const pct = Math.round(Math.min(100, progress * 100));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={pct >= 100 ? '#22c55e' : pct >= 50 ? '#0ea5e9' : '#f59e0b'}
          strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-surface-800">{pct}%</span>
      </div>
    </div>
  );
}

function GoalCard({ goal, onAction }) {
  const colors = PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS.MEDIUM;
  const status = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ACTIVE;

  return (
    <div className={`card p-4 border ${colors.border} relative overflow-hidden animate-fade-in`}>
      <div className="flex items-start gap-3">
        <GoalProgressRing progress={goal.progress} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-surface-900 truncate">{goal.title}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.badge}`}>
              {goal.priority}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-lg font-black text-surface-900">
              {Number(goal.current_saved).toLocaleString()}
            </span>
            <span className="text-xs text-surface-400">
              / {Number(goal.target_amount).toLocaleString()} MAD
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-surface-500">
            <span>📅 {new Date(goal.target_date).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
            {goal.predicted_completion_date && (
              <span className={goal.progress >= 0.5 ? 'text-success-600' : 'text-warning-500'}>
                🎯 Est. {new Date(goal.predicted_completion_date).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          {goal.monthly_needed > 0 && (
            <p className="text-xs text-primary-600 font-semibold mt-1">
              💡 Save {Number(goal.monthly_needed).toLocaleString()} MAD/mo to stay on track
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${status.color}`}>{status.label}</span>
        <div className="flex-1" />
        {goal.status === 'ACTIVE' && (
          <button onClick={() => onAction(goal.id, 'PAUSED')}
            className="text-xs text-surface-500 hover:text-surface-700 font-medium px-2 py-1 rounded hover:bg-surface-100 transition-colors">
            Pause
          </button>
        )}
        {goal.status === 'PAUSED' && (
          <button onClick={() => onAction(goal.id, 'ACTIVE')}
            className="text-xs text-primary font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors">
            Resume
          </button>
        )}
      </div>
    </div>
  );
}

function CreateGoalModal({ show, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    title: '', target_amount: '', target_date: '', priority: 'MEDIUM', description: '',
  });

  if (!show) return null;

  const suggestions = [
    { title: 'Emergency Fund', icon: '🛡️', amount: 10000 },
    { title: 'Vacation', icon: '✈️', amount: 5000 },
    { title: 'New Car', icon: '🚗', amount: 50000 },
    { title: 'Education', icon: '📚', amount: 20000 },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end animate-fade-in">
      <div className="w-full bg-white rounded-t-3xl p-5 pb-safe max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-surface-900">New Savings Goal</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-surface-500">✕</button>
        </div>

        {/* Quick suggestions */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
          {suggestions.map(s => (
            <button key={s.title}
              onClick={() => setForm(f => ({ ...f, title: s.title, target_amount: s.amount }))}
              className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${form.title === s.title ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-surface-50 border-surface-200 text-surface-600 hover:bg-surface-100'}`}>
              <span className="mr-1">{s.icon}</span> {s.title}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Goal Name</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Emergency Fund" className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Target Amount (MAD)</label>
            <input type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
              placeholder="10000" className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Target Date</label>
            <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-2">Priority</label>
            <div className="flex gap-2">
              {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${form.priority === p ? `${PRIORITY_COLORS[p].badge} ring-2 ring-offset-1 ${p === 'HIGH' ? 'ring-red-300' : p === 'MEDIUM' ? 'ring-amber-300' : 'ring-blue-300'}` : 'bg-surface-50 text-surface-500 border border-surface-200'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <PrimaryButton fullWidth loading={loading}
            onClick={() => onSubmit(form)}
            disabled={!form.title || !form.target_amount || !form.target_date}>
            Create Goal
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function CreateRuleModal({ show, onClose, onSubmit, goals, loading }) {
  const [form, setForm] = useState({ rule_type: 'ROUND_UP', value: '10', goal_id: null });
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end animate-fade-in">
      <div className="w-full bg-white rounded-t-3xl p-5 pb-safe animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-surface-900">New Auto-Save Rule</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-surface-500">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-2">Rule Type</label>
            <div className="space-y-2">
              {Object.entries(RULE_TYPE_LABELS).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, rule_type: key }))}
                  className={`w-full p-3 rounded-xl border text-left transition-colors ${form.rule_type === key ? 'bg-primary-50 border-primary-300' : 'bg-surface-50 border-surface-200 hover:bg-surface-100'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cfg.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-surface-900">{cfg.label}</p>
                      <p className="text-xs text-surface-500">{cfg.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">
              {form.rule_type === 'ROUND_UP' ? 'Round up to nearest (MAD)' : form.rule_type === 'PERCENT_INCOME' ? 'Percentage (%)' : 'Fixed Amount (MAD)'}
            </label>
            <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-400 outline-none" />
          </div>
          {goals.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Linked Goal (optional)</label>
              <select value={form.goal_id || ''} onChange={e => setForm(f => ({ ...f, goal_id: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-400 outline-none">
                <option value="">Primary goal (auto)</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6">
          <PrimaryButton fullWidth loading={loading} onClick={() => onSubmit(form)}>
            Create Rule
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const navigate = useNavigate();
  const identity = getStoredUserIdentity();
  const token = identity?.token;

  const [goals, setGoals] = useState([]);
  const [rules, setRules] = useState([]);
  const [safetyFloor, setSafetyFloor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [goalsRes, rulesRes] = await Promise.all([
        getGoals(token).catch(() => null),
        getAutoSaveRules(token).catch(() => null),
      ]);
      if (goalsRes?.result) {
        setGoals(goalsRes.result.goals || []);
        setSafetyFloor(goalsRes.result.safety_floor || 0);
      }
      if (rulesRes?.result) {
        setRules(rulesRes.result.rules || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleCreateGoal = async (form) => {
    setCreating(true);
    try {
      await createGoal({ ...form, token, target_amount: parseFloat(form.target_amount) });
      setShowGoalModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleGoalAction = async (goalId, newStatus) => {
    try {
      await updateGoal(goalId, { token, status: newStatus });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateRule = async (form) => {
    setCreating(true);
    try {
      await createAutoSaveRule({ ...form, token, value: parseFloat(form.value) });
      setShowRuleModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingState message="Loading your goals…" />;

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const otherGoals = goals.filter(g => g.status !== 'ACTIVE');
  const totalSaved = goals.reduce((sum, g) => sum + g.current_saved, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalAutoSaved = rules.reduce((sum, r) => sum + r.total_auto_saved, 0);

  return (
    <div className="px-4 pb-8 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-surface-900">Savings Goals</h1>
        <p className="text-xs text-surface-400 mt-0.5">Track your progress and build your future</p>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 p-3 rounded-xl text-sm font-semibold flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-danger-500 p-1">✕</button>
        </div>
      )}

      {/* Overview Card */}
      <div className="card p-5 bg-gradient-primary border-0 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-primary-100 text-xs font-semibold uppercase tracking-wider">Total Progress</p>
              <p className="text-2xl font-bold mt-1">{totalSaved.toLocaleString()} <span className="text-sm font-medium text-primary-100">/ {totalTarget.toLocaleString()} MAD</span></p>
            </div>
            <GoalProgressRing progress={totalTarget > 0 ? totalSaved / totalTarget : 0} size={56} stroke={4} />
          </div>
          <div className="flex gap-3">
            <div className="bg-white/15 px-3 py-1.5 rounded-lg flex-1 text-center">
              <p className="text-[10px] text-primary-100 uppercase font-semibold">Goals</p>
              <p className="text-sm font-bold">{activeGoals.length}</p>
            </div>
            <div className="bg-white/15 px-3 py-1.5 rounded-lg flex-1 text-center">
              <p className="text-[10px] text-primary-100 uppercase font-semibold">Safety Floor</p>
              <p className="text-sm font-bold">{safetyFloor.toLocaleString()}</p>
            </div>
            <div className="bg-white/15 px-3 py-1.5 rounded-lg flex-1 text-center">
              <p className="text-[10px] text-primary-100 uppercase font-semibold">Auto-Saved</p>
              <p className="text-sm font-bold">{totalAutoSaved.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Goals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Active Goals</h2>
          <button onClick={() => setShowGoalModal(true)}
            className="text-xs font-bold text-primary bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors">
            + New Goal
          </button>
        </div>
        {activeGoals.length === 0 ? (
          <EmptyState icon="🎯" title="No active goals" message="Create your first savings goal to start tracking!" actionLabel="Create Goal" onAction={() => setShowGoalModal(true)} />
        ) : (
          <div className="space-y-3">
            {activeGoals.map(g => <GoalCard key={g.id} goal={g} onAction={handleGoalAction} />)}
          </div>
        )}
      </div>

      {/* Completed/Paused */}
      {otherGoals.length > 0 && (
        <div>
          <h2 className="section-title mb-3">Other Goals</h2>
          <div className="space-y-3">
            {otherGoals.map(g => <GoalCard key={g.id} goal={g} onAction={handleGoalAction} />)}
          </div>
        </div>
      )}

      {/* Auto-Save Rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Auto-Save Rules</h2>
          <button onClick={() => setShowRuleModal(true)}
            className="text-xs font-bold text-accent bg-accent-50 px-3 py-1.5 rounded-lg hover:bg-accent-100 transition-colors">
            + New Rule
          </button>
        </div>
        {rules.length === 0 ? (
          <div className="card p-4 border border-dashed border-surface-300">
            <div className="text-center">
              <p className="text-2xl mb-2">🤖</p>
              <p className="text-sm font-semibold text-surface-700">No auto-save rules yet</p>
              <p className="text-xs text-surface-400 mt-1">Set up rules to save automatically on every transaction</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(r => {
              const cfg = RULE_TYPE_LABELS[r.rule_type] || RULE_TYPE_LABELS.ROUND_UP;
              return (
                <div key={r.id} className="card p-3 flex items-center gap-3 border border-surface-200">
                  <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center text-lg border border-accent-100">
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900">{cfg.label}</p>
                    <p className="text-xs text-surface-500">
                      {r.rule_type === 'PERCENT_INCOME' ? `${r.value}%` : `${r.value} MAD`}
                      {r.goal_title ? ` → ${r.goal_title}` : ' → Primary goal'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-surface-900">{r.total_auto_saved.toLocaleString()}</p>
                    <p className="text-[10px] text-surface-400 uppercase">saved</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGoalModal show={showGoalModal} onClose={() => setShowGoalModal(false)} onSubmit={handleCreateGoal} loading={creating} />
      <CreateRuleModal show={showRuleModal} onClose={() => setShowRuleModal(false)} onSubmit={handleCreateRule} goals={activeGoals} loading={creating} />
    </div>
  );
}

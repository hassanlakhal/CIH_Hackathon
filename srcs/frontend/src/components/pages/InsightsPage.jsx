/**
 * InsightsPage — AI Financial Insights Hub
 * Trigger analysis, view expense breakdowns, and get AI recommendations.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerInsight, getInsight } from '../../services/walletService.js';
import { getStoredUserIdentity } from '../../utils/userIdentity.js';
import PrimaryButton from '../ui/PrimaryButton.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';

function BarChart({ data, maxValue }) {
  if (!data || Object.keys(data).length === 0) return null;
  const max = maxValue || Math.max(...Object.values(data), 1);

  return (
    <div className="space-y-2.5">
      {Object.entries(data).map(([label, value]) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-surface-600 font-medium capitalize">{label.replace(/_/g, ' ')}</span>
            <span className="text-surface-900 font-bold">{Number(value).toLocaleString()} MAD</span>
          </div>
          <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, subtitle, icon, variant = 'default' }) {
  const bgClass = variant === 'success' ? 'bg-success-50 border-success-200'
    : variant === 'warning' ? 'bg-warning-50 border-warning-200'
    : variant === 'danger' ? 'bg-danger-50 border-danger-200'
    : 'bg-white border-surface-200';

  return (
    <div className={`card p-3.5 border ${bgClass}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">{label}</p>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-lg font-black text-surface-900">{value}</p>
      {subtitle && <p className="text-[10px] text-surface-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ScoreBadge({ score, delta }) {
  const color = score >= 80 ? 'text-success-600 bg-success-50 border-success-200'
    : score >= 60 ? 'text-primary-600 bg-primary-50 border-primary-200'
    : score >= 40 ? 'text-warning-600 bg-warning-50 border-warning-200'
    : 'text-danger-600 bg-danger-50 border-danger-200';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${color} font-bold text-sm`}>
      <span>{score}/100</span>
      {delta !== 0 && (
        <span className={`text-xs ${delta > 0 ? 'text-success-600' : 'text-danger-500'}`}>
          {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const identity = getStoredUserIdentity();
  const token = identity?.token;

  const [insight, setInsight] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getInsight(token)
      .then(res => {
        if (res?.result?.survey_required) {
          navigate('/survey');
          return;
        }
        if (res?.result?.insight) {
          setInsight(res.result.insight);
          setGoals(res.result.goals || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await triggerInsight(token);
      if (res?.result?.survey_required) {
        navigate('/survey');
        return;
      }
      if (res?.result?.insight) {
        setInsight(res.result.insight);
        setGoals(res.result.goals || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingState message="Loading insights…" />;

  return (
    <div className="px-4 pb-8 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">AI Insights</h1>
          <p className="text-xs text-surface-400 mt-0.5">Powered by CYCLOPS AI</p>
        </div>
        <PrimaryButton onClick={handleGenerate} loading={generating} className="text-xs !px-4 !py-2">
          {insight ? '🔄 Refresh' : '✨ Generate'}
        </PrimaryButton>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 p-3 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {!insight ? (
        <EmptyState icon="🧠" title="No insights yet"
          message="Generate your first AI insight to get personalized financial analysis and recommendations."
          actionLabel="Generate Insight" onAction={handleGenerate} />
      ) : (
        <>
          {/* AI Summary Card */}
          <div className="card p-5 bg-gradient-to-br from-surface-800 to-surface-900 text-white border-0 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🧠</span>
                <h2 className="text-sm font-bold text-surface-200">AI Summary</h2>
                <div className="flex-1" />
                <ScoreBadge score={insight.health_score} delta={insight.health_score_delta} />
              </div>
              <p className="text-sm leading-relaxed text-surface-100">{insight.summary_message}</p>
              {insight.warning && (
                <div className="mt-3 bg-danger-500/20 border border-danger-400/30 rounded-xl p-3 text-xs text-danger-200 font-medium">
                  {insight.warning}
                </div>
              )}
            </div>
          </div>

          {/* Tip Card */}
          {insight.tip && (
            <div className="card p-4 bg-primary-50 border border-primary-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-xs font-bold text-primary-800 uppercase tracking-wide mb-1">AI Tip</p>
                  <p className="text-sm text-primary-700 leading-relaxed">{insight.tip}</p>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Income" value={`${Number(insight.total_income_last_month).toLocaleString()}`} icon="💰"
              subtitle="Last month" variant={insight.total_income_last_month > 0 ? 'success' : 'default'} />
            <MetricCard label="Expenses" value={`${Number(insight.total_expenses_last_month).toLocaleString()}`} icon="💸"
              subtitle="Last month" variant={insight.total_expenses_last_month > insight.total_income_last_month * 0.8 ? 'warning' : 'default'} />
            <MetricCard label="Net Saved" value={`${Number(insight.net_savings_last_month).toLocaleString()}`} icon="🏦"
              subtitle={`${insight.savings_rate_pct}% savings rate`} variant={insight.net_savings_last_month > 0 ? 'success' : 'danger'} />
            <MetricCard label="Safety Floor" value={`${Number(insight.safety_floor_recommendation).toLocaleString()}`} icon="🛡️"
              subtitle="Recommended" />
          </div>

          {/* Forecast */}
          <div className="card p-4 border border-surface-200">
            <h3 className="section-title mb-3">📊 This Month Forecast</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-surface-600">Estimated Income</span>
                <span className="text-sm font-bold text-surface-900">{Number(insight.estimated_income_this_month).toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-surface-600">Estimated Expenses</span>
                <span className="text-sm font-bold text-surface-900">{Number(insight.estimated_expenses_this_month).toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-surface-100">
                <span className="text-sm font-semibold text-primary-700">Recommended to Save</span>
                <span className="text-sm font-black text-primary">{Number(insight.recommended_saving_this_month).toLocaleString()} MAD</span>
              </div>
            </div>
          </div>

          {/* Goal Status & Plan */}
          {(insight.predicted_goal_date || insight.goal_achievement_plan) && (
            <div className={`card p-4 border ${insight.goal_on_track ? 'border-success-200 bg-success-50' : 'border-warning-200 bg-warning-50'}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{insight.goal_on_track ? '✅' : '⚠️'}</span>
                <div>
                  <p className="text-sm font-bold text-surface-900">
                    {insight.goal_on_track ? 'Goal on Track!' : 'Goal at Risk'}
                  </p>
                  {insight.predicted_goal_date && (
                    <p className="text-xs text-surface-600">
                      Predicted completion: {new Date(insight.predicted_goal_date).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              {insight.goal_achievement_plan && (
                <div className="mt-2 pt-2 border-t border-surface-200/50">
                  <p className="text-xs font-bold uppercase text-surface-500 mb-1">Achievement Plan</p>
                  <p className="text-sm text-surface-800 leading-relaxed font-medium">{insight.goal_achievement_plan}</p>
                </div>
              )}
            </div>
          )}

          {/* Expense Breakdown */}
          {insight.expense_categories && Object.keys(insight.expense_categories).length > 0 && (
            <div className="card p-4 border border-surface-200">
              <h3 className="section-title mb-4">💳 Expense Categories</h3>
              <BarChart data={insight.expense_categories} />
            </div>
          )}

          {/* Necessary vs Optional */}
          <div className="grid grid-cols-2 gap-3">
            {insight.necessary_expenses && Object.keys(insight.necessary_expenses).length > 0 && (
              <div className="card p-3 border border-surface-200">
                <h4 className="text-[10px] font-bold text-surface-500 uppercase mb-2">🔒 Necessary</h4>
                {Object.entries(insight.necessary_expenses).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-surface-50 last:border-0">
                    <span className="text-surface-600 capitalize">{k}</span>
                    <span className="font-bold text-surface-900">{Number(v).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {insight.optional_expenses && Object.keys(insight.optional_expenses).length > 0 && (
              <div className="card p-3 border border-surface-200">
                <h4 className="text-[10px] font-bold text-surface-500 uppercase mb-2">✂️ Optional</h4>
                {Object.entries(insight.optional_expenses).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-surface-50 last:border-0">
                    <span className="text-surface-600 capitalize">{k}</span>
                    <span className="font-bold text-accent-600">{Number(v).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saving Opportunities */}
          {insight.saving_opportunities && insight.saving_opportunities.length > 0 && (
            <div className="card p-4 border border-accent-200 bg-accent-50">
              <h3 className="text-xs font-bold text-accent-800 uppercase tracking-wide mb-3">💡 Saving Opportunities</h3>
              <div className="space-y-2">
                {insight.saving_opportunities.map((opp, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-accent-400 text-xs mt-0.5">▸</span>
                    <p className="text-sm text-accent-800 leading-relaxed">{opp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Income Sources */}
          {insight.income_sources && Object.keys(insight.income_sources).length > 0 && (
            <div className="card p-4 border border-surface-200">
              <h3 className="section-title mb-4">💰 Income Sources</h3>
              <BarChart data={insight.income_sources} />
            </div>
          )}

          {/* Metadata */}
          <div className="text-center text-xs text-surface-400 pb-4">
            <p>Generated {new Date(insight.generated_at).toLocaleString()}</p>
            <p>Covering {new Date(insight.month).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
          </div>
        </>
      )}
    </div>
  );
}

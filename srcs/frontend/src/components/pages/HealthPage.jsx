/**
 * HealthPage — Financial Health Dashboard
 * Animated score gauge, sub-scores, and monthly trend.
 */
import { useState, useEffect } from 'react';
import { getHealthScores } from '../../services/walletService.js';
import { getStoredUserIdentity } from '../../utils/userIdentity.js';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const LABEL_CONFIG = {
  EXCELLENT: { emoji: '🌟', color: 'text-success-600', bg: 'bg-success-50', ring: '#22c55e', gradient: 'from-emerald-400 to-green-500' },
  GOOD: { emoji: '👍', color: 'text-primary-600', bg: 'bg-primary-50', ring: '#0ea5e9', gradient: 'from-sky-400 to-blue-500' },
  NEEDS_WORK: { emoji: '⚠️', color: 'text-warning-600', bg: 'bg-warning-50', ring: '#f59e0b', gradient: 'from-amber-400 to-orange-500' },
  CRITICAL: { emoji: '🔴', color: 'text-danger-600', bg: 'bg-danger-50', ring: '#ef4444', gradient: 'from-red-400 to-rose-500' },
};

function ScoreGauge({ score, label, size = 180 }) {
  const config = LABEL_CONFIG[label] || LABEL_CONFIG.GOOD;
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
        <svg width={size} height={size / 2 + 20} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M 10,${size / 2} A ${radius},${radius} 0 0,1 ${size - 10},${size / 2}`}
            fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d={`M 10,${size / 2} A ${radius},${radius} 0 0,1 ${size - 10},${size / 2}`}
            fill="none" stroke={config.ring} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1500 ease-out"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <p className="text-5xl font-black text-surface-900 tabular-nums">{score}</p>
          <p className="text-xs text-surface-400 font-semibold">out of 100</p>
        </div>
      </div>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl mt-2 ${config.bg}`}>
        <span className="text-lg">{config.emoji}</span>
        <span className={`text-sm font-bold ${config.color} capitalize`}>{label.replace(/_/g, ' ')}</span>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score, maxScore, icon, color }) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return (
    <div className="card p-3.5 border border-surface-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-surface-600">{label}</span>
        <span className="ml-auto text-sm font-black text-surface-900">{score}<span className="text-xs text-surface-400 font-medium">/{maxScore}</span></span>
      </div>
      <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function SparkLine({ data }) {
  if (!data || data.length === 0) return null;

  const maxScore = Math.max(...data.map(d => d.score), 100);
  const width = 280;
  const height = 80;
  const padding = 10;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - (d.score / maxScore) * (height - 2 * padding);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

  return (
    <div className="card p-4 border border-surface-200">
      <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-3">Score History</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '100px' }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sparkGrad)" />
        <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#0ea5e9" strokeWidth="2" />
            <text x={p.x} y={height - 1} textAnchor="middle" className="fill-surface-400" fontSize="8" fontWeight="600">
              {new Date(p.month).toLocaleDateString('en', { month: 'short' })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function HealthPage() {
  const identity = getStoredUserIdentity();
  const token = identity?.token;

  const [scores, setScores] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getHealthScores(token)
      .then(res => {
        if (res?.result) {
          setScores(res.result.scores || []);
          setCurrent(res.result.current);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState message="Loading health score…" />;

  if (!current) {
    return (
      <div className="px-5 py-12">
        <EmptyState icon="❤️" title="No health score yet"
          message="Generate an AI insight first to get your financial health score."
        />
      </div>
    );
  }

  // Find latest score details from the array
  const latest = scores.length > 0 ? scores[scores.length - 1] : null;

  return (
    <div className="px-4 pb-8 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="pt-2 text-center">
        <h1 className="text-xl font-bold text-surface-900">Financial Health</h1>
        <p className="text-xs text-surface-400 mt-0.5">Your monthly wellness check</p>
      </div>

      {/* Main Score Gauge */}
      <div className="card p-6 border border-surface-200 flex flex-col items-center">
        <ScoreGauge score={current.score} label={current.label} />
        {current.delta !== 0 && (
          <div className={`mt-3 flex items-center gap-1 text-sm font-bold ${current.delta > 0 ? 'text-success-600' : 'text-danger-500'}`}>
            <span className="text-lg">{current.delta > 0 ? '📈' : '📉'}</span>
            {current.delta > 0 ? '+' : ''}{current.delta} from last month
          </div>
        )}
      </div>

      {/* Sub-scores */}
      {latest && (
        <div>
          <h2 className="section-title mb-3">Score Breakdown</h2>
          <div className="space-y-2.5">
            <SubScoreBar label="Savings Rate" score={latest.savings_rate_score} maxScore={40}
              icon="💰" color="bg-gradient-to-r from-emerald-400 to-green-500" />
            <SubScoreBar label="Goal Progress" score={latest.goal_progress_score} maxScore={30}
              icon="🎯" color="bg-gradient-to-r from-sky-400 to-blue-500" />
            <SubScoreBar label="Stability" score={latest.stability_score} maxScore={30}
              icon="⚖️" color="bg-gradient-to-r from-violet-400 to-purple-500" />
          </div>
        </div>
      )}

      {/* Score Tips */}
      <div className="card p-4 border border-surface-200">
        <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">How to Improve</h3>
        <div className="space-y-2.5">
          {latest && latest.savings_rate_score < 30 && (
            <div className="flex items-start gap-2">
              <span className="text-success-400 text-xs mt-0.5">▸</span>
              <p className="text-sm text-surface-700"><strong>Savings Rate:</strong> Try to save at least 20% of your income each month</p>
            </div>
          )}
          {latest && latest.goal_progress_score < 20 && (
            <div className="flex items-start gap-2">
              <span className="text-primary-400 text-xs mt-0.5">▸</span>
              <p className="text-sm text-surface-700"><strong>Goal Progress:</strong> Set up auto-save rules to stay on track</p>
            </div>
          )}
          {latest && latest.stability_score < 20 && (
            <div className="flex items-start gap-2">
              <span className="text-purple-400 text-xs mt-0.5">▸</span>
              <p className="text-sm text-surface-700"><strong>Stability:</strong> Keep consistent spending patterns month to month</p>
            </div>
          )}
          {(!latest || (latest.savings_rate_score >= 30 && latest.goal_progress_score >= 20 && latest.stability_score >= 20)) && (
            <div className="flex items-start gap-2">
              <span className="text-success-400 text-xs mt-0.5">✓</span>
              <p className="text-sm text-surface-700">You're doing great! Keep maintaining your financial discipline.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sparkline History */}
      {scores.length > 1 && <SparkLine data={scores} />}

      {/* Monthly breakdown table */}
      {scores.length > 0 && (
        <div className="card border border-surface-200 overflow-hidden">
          <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-widest px-4 pt-3 pb-2">Monthly History</h3>
          {scores.slice().reverse().map((s, i) => {
            const cfg = LABEL_CONFIG[s.label] || LABEL_CONFIG.GOOD;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-100 hover:bg-surface-50">
                <span className="text-base">{cfg.emoji}</span>
                <span className="text-sm text-surface-600 flex-1">
                  {new Date(s.month).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                </span>
                <span className={`text-sm font-black ${cfg.color}`}>{s.score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * StatCard — displays a single metric with label, value, and optional icon/trend.
 * Used on the Dashboard for Total Saved, Current Balance, Safety Floor, etc.
 */
export default function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  className = '',
}) {
  const trendColor =
    trend === 'up'
      ? 'text-success-600 bg-success-50'
      : trend === 'down'
        ? 'text-danger-500 bg-danger-50'
        : 'text-surface-500 bg-surface-100';

  return (
    <div
      className={`card p-4 flex flex-col gap-1.5 transition-shadow duration-200 hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && (
          <span className="w-8 h-8 rounded-xl bg-aura-50 text-aura-600 flex items-center justify-center text-sm">
            {icon}
          </span>
        )}
      </div>

      <span className="stat-value">{value}</span>

      {(subtitle || trendLabel) && (
        <div className="flex items-center gap-2 mt-0.5">
          {trendLabel && (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${trendColor}`}
            >
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}{' '}
              {trendLabel}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-surface-400">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

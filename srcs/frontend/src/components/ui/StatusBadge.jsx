/**
 * StatusBadge — small inline badge for status labels like "completed", "pending", etc.
 */

const VARIANTS = {
  completed: 'bg-success-50 text-success-600 border-success-100',
  active: 'bg-aura-50 text-aura-700 border-aura-100',
  pending: 'bg-warning-50 text-warning-500 border-warning-100',
  failed: 'bg-danger-50 text-danger-500 border-danger-100',
  inactive: 'bg-surface-100 text-surface-500 border-surface-200',
  default: 'bg-surface-100 text-surface-600 border-surface-200',
};

export default function StatusBadge({ status, label, className = '' }) {
  const variant = VARIANTS[status] || VARIANTS.default;
  const displayLabel = label || status || '—';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variant} ${className}`}
    >
      {displayLabel}
    </span>
  );
}

/**
 * EmptyState — displayed when a section has no data to show.
 * Provides a friendly message and optional action button.
 */
export default function EmptyState({
  icon = '📭',
  title = 'Rien à afficher',
  message = 'Aucune donnée disponible pour le moment.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 gap-3 text-center ${className}`}
    >
      <span className="text-4xl mb-1">{icon}</span>
      <h4 className="text-base font-semibold text-surface-700">{title}</h4>
      <p className="text-sm text-surface-400 max-w-xs leading-relaxed">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

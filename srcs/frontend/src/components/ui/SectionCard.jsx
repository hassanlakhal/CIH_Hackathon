/**
 * SectionCard — a titled card container used to group related content.
 * Provides consistent spacing, rounded corners, and optional action link.
 */
export default function SectionCard({
  title,
  action,
  onAction,
  children,
  className = '',
  noPadding = false,
}) {
  return (
    <div className={`card animate-fade-in ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {title && <h3 className="section-title">{title}</h3>}
          {action && (
            <button
              onClick={onAction}
              className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              {action}
            </button>
          )}
        </div>
      )}
      <div className={noPadding ? '' : 'px-5 pb-4'}>{children}</div>
    </div>
  );
}

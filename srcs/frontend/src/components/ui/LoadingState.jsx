/**
 * LoadingState — full-section skeleton/spinner placeholder shown while data loads.
 */
export default function LoadingState({ message = 'Chargement…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 gap-4 ${className}`}>
      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse-soft" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-primary-300 animate-pulse-soft" style={{ animationDelay: '200ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-primary-200 animate-pulse-soft" style={{ animationDelay: '400ms' }} />
      </div>
      <p className="text-sm text-surface-400 font-medium">{message}</p>
    </div>
  );
}

/**
 * SkeletonBlock — individual skeleton placeholder for layout shimmer effects.
 */
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-surface-100 rounded-xl animate-pulse ${className}`}
    />
  );
}

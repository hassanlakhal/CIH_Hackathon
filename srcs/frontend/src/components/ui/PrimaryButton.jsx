/**
 * PrimaryButton — branded CTA button with loading state support.
 */
export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-gradient-primary hover:brightness-105 active:brightness-95 focus:ring-primary-400 shadow-sm hover:shadow-md',
    accent:
      'bg-gradient-accent hover:brightness-105 active:brightness-95 focus:ring-accent-400 shadow-sm hover:shadow-md',
    secondary:
      'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50 active:bg-surface-100 focus:ring-primary-400',
    ghost:
      'bg-transparent text-primary hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-400',
    danger:
      'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 focus:ring-danger-400',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

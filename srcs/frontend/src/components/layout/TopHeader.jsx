/**
 * TopHeader — sticky top bar with page title and profile avatar.
 * Mobile-first with subtle bottom border.
 */
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/': 'Accueil',
  '/onboarding': 'Bienvenue',
  '/wallet-activation': 'Activation',
  '/activity': 'Activité',
  '/settings': 'Paramètres',
};

export default function TopHeader() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Aura';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-surface-100 safe-top">
      <div className="flex items-center justify-between px-5 py-3 max-w-lg mx-auto">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-aura-500 to-aura-700 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-surface-900 tracking-tight">
            {title}
          </h1>
        </div>

        {/* Profile avatar */}
        <button className="w-9 h-9 rounded-full bg-aura-50 border border-aura-100 flex items-center justify-center text-aura-700 font-semibold text-sm hover:bg-aura-100 transition-colors">
          YE
        </button>
      </div>
    </header>
  );
}

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
  '/transactions': 'Transactions',
  '/settings': 'Paramètres',
};

export default function TopHeader() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'MindSave';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-surface-100 safe-top">
      <div className="flex items-center justify-between px-5 py-3 max-w-lg mx-auto">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MindSave" className="w-10 h-10 rounded-xl object-contain" />
          <h1 className="text-lg font-bold text-surface-900 tracking-tight">
            {title}
          </h1>
        </div>

        {/* Profile avatar */}
        <button className="w-9 h-9 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm hover:bg-primary-100 transition-colors">
          YE
        </button>
      </div>
    </header>
  );
}

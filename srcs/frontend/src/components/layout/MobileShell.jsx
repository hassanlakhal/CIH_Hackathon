/**
 * MobileShell — the main app shell wrapping all pages.
 * Centers the mobile frame on desktop, constrains max width,
 * and provides consistent top header + bottom nav + scrollable content area.
 */
import { Outlet } from 'react-router-dom';
import TopHeader from './TopHeader.jsx';
import BottomNav from './BottomNav.jsx';

export default function MobileShell() {
  return (
    <div className="min-h-screen bg-surface-50 flex justify-center">
      {/* Mobile frame — constrained width centered on desktop */}
      <div className="w-full max-w-lg min-h-screen flex flex-col bg-surface-50 relative">
        <TopHeader />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto pb-24 pt-2">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

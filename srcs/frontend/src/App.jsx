import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MobileShell from './components/layout/MobileShell.jsx';
import Dashboard from './components/pages/Dashboard.jsx';
import Onboarding from './components/pages/Onboarding.jsx';
import WalletActivation from './components/pages/WalletActivation.jsx';
import ActivityFeed from './components/pages/ActivityFeed.jsx';
import Settings from './components/pages/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app shell with bottom nav */}
        <Route element={<MobileShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Full-screen flows (no bottom nav) */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/wallet-activation" element={<WalletActivation />} />
      </Routes>
    </BrowserRouter>
  );
}

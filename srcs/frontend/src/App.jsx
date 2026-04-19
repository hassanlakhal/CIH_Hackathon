import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { checkWalletToken } from './services/walletService.js';
import { getStoredUserIdentity, updateStoredUserIdentity, setAuraContractId } from './utils/userIdentity.js';
import MobileShell from './components/layout/MobileShell.jsx';
import Dashboard from './components/pages/Dashboard.jsx';
import Onboarding from './components/pages/Onboarding.jsx';
import WalletActivation from './components/pages/WalletActivation.jsx';
import ActivityFeed from './components/pages/ActivityFeed.jsx';
import Settings from './components/pages/Settings.jsx';
import Transactions from './components/pages/Transactions.jsx';
import TransactionAction from './components/pages/TransactionAction.jsx';
import SurveyPage from './components/pages/SurveyPage.jsx';
import GoalsPage from './components/pages/GoalsPage.jsx';
import InsightsPage from './components/pages/InsightsPage.jsx';
import HealthPage from './components/pages/HealthPage.jsx';
import SavingAccountPage from './components/pages/SavingAccountPage.jsx';

export default function App() {
  const [initFinished, setInitFinished] = useState(false);

  useEffect(() => {
    const identity = getStoredUserIdentity();
    const token = identity?.token || localStorage.getItem('aura_precreate_token');

    if (token) {
      checkWalletToken(token)
        .then(res => {
          if (res?.contractId) {
             updateStoredUserIdentity({
               contractId: res.contractId,
               phoneNumber: res.phoneNumber,
               firstName: res.firstName,
               lastName: res.lastName,
               identificationType: res.identificationType,
               identificationNumber: res.identificationNumber,
               token: token
             });
             setAuraContractId(res.contractId);
          }
        })
        .catch(console.error)
        .finally(() => setInitFinished(true));
    } else {
      setInitFinished(true);
    }
  }, []);

  if (!initFinished) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Main app shell with bottom nav */}
        <Route element={<MobileShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/saving-account" element={<SavingAccountPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Full-screen flows (no bottom nav) */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/wallet-activation" element={<WalletActivation />} />
        <Route path="/transactions/:type" element={<TransactionAction />} />
      </Routes>
    </BrowserRouter>
  );
}

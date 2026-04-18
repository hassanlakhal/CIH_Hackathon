/**
 * WalletActivation — wallet activation flow (step 2 of wallet creation).
 *
 * Reads the token from localStorage (stored during onboarding pre-registration)
 * and uses POST /wallet?state=activate with { token, otp } to activate the wallet.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activateWallet } from '../../services/walletService.js';
import PrimaryButton from '../ui/PrimaryButton.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function WalletActivation() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState('');

  // Read the pre-registration token on mount
  useEffect(() => {
    const stored = localStorage.getItem('aura_precreate_token');
    if (stored) {
      setToken(stored);
    }
  }, []);

  const handleActivate = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError('Please enter the OTP code.');
      return;
    }

    if (!token) {
      setError('No pre-registration token found. Please complete onboarding first.');
      return;
    }

    setLoading(true);
    try {
      const response = await activateWallet({ token, otp: otp.trim() });

      // Clean up temporary state
      localStorage.removeItem('aura_precreate_token');
      localStorage.removeItem('aura_precreate_otp');

      // Store new data
      if (response?.result) {
        if (response.result.contractId) {
          localStorage.setItem('aura_contract_id', response.result.contractId);
        }
        if (response.result.rib) {
          localStorage.setItem('aura_rib', response.result.rib);
        }
      }

      setDone(true);
      setTimeout(() => {
        navigate('/');
      }, 2500); // Redirect after 2.5s
    } catch (err) {
      setError(err.message || 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Success screen ────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-success-50 border border-success-100 flex items-center justify-center text-4xl mx-auto mb-6">
            🎉
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-2 tracking-tight">
            Wallet activated!
          </h2>
          <p className="text-surface-500 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
            Your Aura wallet is ready. Invisible savings starts now.
            <br />
            <br />
            Redirecting softly to dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ─── Activation form ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-surface-100">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/onboarding')}
            className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-600">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-base font-bold text-surface-900 tracking-tight">Wallet Activation</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Illustration */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-aura-50 border border-aura-100 flex items-center justify-center text-3xl mb-4">
            🔐
          </div>
          <h1 className="text-xl font-bold text-surface-900 tracking-tight mb-2">
            Enter your activation code
          </h1>
          <p className="text-sm text-surface-500 max-w-xs leading-relaxed">
            We sent a 6-digit code to your phone number. Enter it below to activate your wallet.
          </p>
        </div>

        {/* Token display */}
        {token && (
          <div className="card p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-400 font-medium mb-0.5">Pre-registration token</p>
              <p className="text-sm font-mono font-semibold text-surface-700">{token}</p>
            </div>
            <StatusBadge status="completed" label="Pre-registered" />
          </div>
        )}

        {!token && (
          <div className="card p-4 mb-6 bg-warning-50 border-warning-100">
            <p className="text-sm text-warning-500 font-medium">
              No pre-registration token found.
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Please{' '}
              <button
                onClick={() => navigate('/onboarding')}
                className="text-aura-600 font-semibold underline"
              >
                complete onboarding
              </button>
              {' '}first.
            </p>
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleActivate}>
          <div className="card p-5 space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-surface-700 mb-1.5">
                OTP Code <span className="text-danger-400">*</span>
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setOtp(val);
                  setError(null);
                }}
                placeholder="• • • • • •"
                className={`
                  w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em]
                  rounded-xl border bg-white outline-none transition-all duration-200
                  placeholder:text-surface-200 placeholder:tracking-[0.3em]
                  focus:ring-2 focus:ring-aura-500/20 focus:border-aura-500
                  ${error ? 'border-danger-400 bg-danger-50/30' : 'border-surface-200'}
                `}
              />
              <p className="mt-2 text-xs text-surface-400 text-center">
                Enter the 6-digit code sent to your phone
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-danger-50 border border-danger-100 text-sm text-danger-600 flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <PrimaryButton
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={!token}
            >
              Activate wallet
            </PrimaryButton>
            <PrimaryButton
              type="button"
              fullWidth
              variant="ghost"
              onClick={() => navigate('/onboarding')}
            >
              Back to registration
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

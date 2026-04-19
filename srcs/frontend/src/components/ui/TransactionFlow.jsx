import { useState } from 'react';
import LoadingState from './LoadingState.jsx';
import EmptyState from './EmptyState.jsx';
import PrimaryButton from './PrimaryButton.jsx';
import { useNavigate } from 'react-router-dom';

/**
 * A reusable multi-step flow for executing transactions.
 * Handled states: 1. Form -> 2. Simulation -> 3. OTP (optional) -> 4. Success
 * 
 * @param {object} props
 * @param {string} props.title - Action title (e.g. "Cash In")
 * @param {function} props.renderForm - (onSubmit: (payload)=>void, isSubmitting: boolean)
 * @param {function} props.onSimulate - (formPayload) => Promise<simData>
 * @param {function} props.renderSimulation - (simData, onConfirm: ()=>void, isSubmitting: boolean)
 * @param {boolean} props.requiresOtp - Whether step 3 is needed
 * @param {function} props.onRequestOtp - (formPayload) => Promise<void>
 * @param {function} props.onConfirm - (formPayload, simData, otpCode) => Promise<confirmData>
 * @param {function} props.renderSuccess - (confirmData, onDone: ()=>void)
 * @param {function} props.onCancel - Called on explicit back/close during initial step
 */
export default function TransactionFlow({
  title,
  renderForm,
  onSimulate,
  renderSimulation,
  requiresOtp = false,
  onRequestOtp,
  onConfirm,
  renderSuccess,
  onCancel
}) {
  const navigate = useNavigate();

  // Steps: 'FORM', 'SIMULATION', 'OTP', 'SUCCESS', 'ERROR'
  const [step, setStep] = useState('FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Stored state between steps
  const [formPayload, setFormPayload] = useState(null);
  const [simData, setSimData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [confirmData, setConfirmData] = useState(null);

  const handleError = (err) => {
    console.error(`[TransactionFlow: ${title}]`, err);
    setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    setStep('ERROR');
  };

  const handleSimulateSubmit = async (payload) => {
    setIsSubmitting(true);
    setFormPayload(payload);
    try {
      const sim = await onSimulate(payload);
      setSimData(sim);
      setStep('SIMULATION');
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedToOTP = async () => {
    setIsSubmitting(true);
    try {
      await onRequestOtp(formPayload);
      setStep('OTP');
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulationConfirm = async () => {
    if (requiresOtp) {
      await proceedToOTP();
    } else {
      await performConfirmation(''); // No OTP
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) return;
    await performConfirmation(otpCode);
  };

  const performConfirmation = async (otp) => {
    setIsSubmitting(true);
    try {
      const res = await onConfirm(formPayload, simData, otp);
      setConfirmData(res);
      setStep('SUCCESS');
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleErrorRetry = () => {
    setErrorMsg('');
    setStep('FORM');
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-50 animate-fade-in relative pb-8">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-surface-100 flex items-center px-4 py-3 min-h-[56px] safe-top">
        <button 
          onClick={step === 'FORM' ? onCancel : () => setStep('FORM')} 
          disabled={isSubmitting || step === 'SUCCESS'}
          className="p-2 -ml-2 text-surface-600 hover:text-surface-900 transition-colors disabled:opacity-30"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="ml-2 font-bold text-lg text-surface-900 tracking-tight">{title}</span>
      </div>

      {/* ─── Steps ─────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-lg mx-auto">
        
        {step === 'FORM' && (
          <div className="animate-slide-up">
            {renderForm(handleSimulateSubmit, isSubmitting)}
          </div>
        )}

        {step === 'SIMULATION' && (
          <div className="animate-slide-left">
            {renderSimulation(simData, handleSimulationConfirm, isSubmitting)}
          </div>
        )}

        {step === 'OTP' && (
          <div className="p-5 animate-slide-left">
            <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-primary-50 text-primary dark-ring rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🔒
              </div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">Verify it's you</h2>
              <p className="text-surface-500 text-sm mb-6">
                Enter the OTP code sent to your phone to securely confirm this transaction.
              </p>
              
              <form onSubmit={handleOtpSubmit}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-mono tracking-widest py-3 border-b-2 border-surface-200 focus:border-primary-400 focus:outline-none bg-transparent mb-6"
                  maxLength={6}
                  required
                />
                <PrimaryButton 
                  type="submit" 
                  disabled={otpCode.length < 4 || isSubmitting}
                  isLoading={isSubmitting}
                  fullWidth
                >
                  Verify and Confirm
                </PrimaryButton>
              </form>
            </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="animate-fade-in">
            {renderSuccess(confirmData, () => navigate('/transactions', { replace: true }))}
          </div>
        )}

        {step === 'ERROR' && (
          <div className="p-5 pt-12">
            <EmptyState
              icon="⚠️"
              title="Transaction Failed"
              message={errorMsg}
              actionLabel="Try again"
              onAction={handleErrorRetry}
            />
            <div className="text-center mt-4">
              <button 
                onClick={onCancel}
                className="text-surface-500 hover:text-surface-900 font-medium text-sm"
              >
                Cancel transaction
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

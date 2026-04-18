import { useState, useEffect } from 'react';
import { simulateBankTransfer, sendTransferOtp, confirmBankTransfer } from '../../services/walletService.js';
import PrimaryButton from './PrimaryButton.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function TransferModal({
  isOpen,
  onClose,
  amount = "12",
  contractId = "LAN252387936812761",
  rib = "230780530712622100950179",
  mobileNumber = "212669268097",
  destinationPhone = "212665873350",
  destinationFirstName = "Aura",
  destinationLastName = "Save",
  onSuccess
}) {
  const [step, setStep] = useState('simulation'); // simulation -> summary -> otp -> success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otp, setOtp] = useState('');
  const [simulationData, setSimulationData] = useState(null);
  const [referenceId, setReferenceId] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('simulation');
      setLoading(false);
      setError(null);
      setOtp('');
      setSimulationData(null);
      setReferenceId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        clientNote: "W2W",
        ContractId: contractId,
        Amount: amount,
        destinationPhone,
        mobileNumber,
        RIB: rib
      };
      const res = await simulateBankTransfer(payload);
      // Map exact officially defined fields from result[0]
      const data = res?.result?.[0] || {};
      setSimulationData({
        amount: amount,
        fees: data.frais || "0",
        totalDebit: data.totalAmountWithFee || amount,
      });
      
      // Some APIs return a reference during simulation.
      setReferenceId(res.referenceId || "0152475499");
      
      setStep('summary');
    } catch (err) {
      setError(err.message || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await sendTransferOtp({ PhoneNumber: mobileNumber });
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        mobileNumber,
        ContractId: contractId,
        Otp: otp,
        referenceId: referenceId || "0152475499",
        destinationPhone,
        fees: String(simulationData?.fees || "0"),
        Amount: String(amount),
        RIB: rib,
        NumBeneficiaire: destinationPhone,
        DestinationFirstName: destinationFirstName,
        DestinationLastName: destinationLastName
      };
      await confirmBankTransfer(payload);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (step === 'simulation') handleSimulate();
    else if (step === 'summary') handleSendOtp();
    else if (step === 'otp') handleConfirm();
    else if (step === 'success') {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const getButtonLabel = () => {
    if (loading) return "Processing...";
    if (step === 'simulation') return "Simulate Transfer";
    if (step === 'summary') return "Confirm & Send OTP";
    if (step === 'otp') return "Validate OTP";
    if (step === 'success') return "Done";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="bg-surface-50 px-5 py-4 border-b border-surface-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-surface-900 tracking-tight">Invisible Move</h3>
            <p className="text-xs text-surface-500 font-medium tracking-wide uppercase mt-0.5">Wallet Transfer</p>
          </div>
          {step !== 'success' && !loading && (
            <button onClick={onClose} className="p-2 -mr-2 text-surface-400 hover:text-surface-700 transition-colors">
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 bg-danger-50 border border-danger-100 text-danger-700 text-xs font-bold p-3 rounded-xl leading-relaxed">
              {error}
            </div>
          )}

          {step === 'simulation' && (
            <div className="py-2 space-y-4">
              <p className="text-sm text-surface-600 leading-relaxed font-medium">
                You are about to initiate an Aura-generated invisible save transaction.
              </p>
              <div className="bg-surface-50 p-4 rounded-2xl border border-surface-100 flex justify-between items-center">
                <span className="text-sm font-bold text-surface-500 uppercase tracking-widest">Amount</span>
                <span className="text-2xl font-black text-aura-800">{formatCurrency(amount)}</span>
              </div>
            </div>
          )}

          {step === 'summary' && simulationData && (
            <div className="py-2 space-y-4 animate-fade-in">
              <div className="flex items-center justify-center mb-6">
                 <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center text-2xl">
                   💸
                 </div>
              </div>
              <div className="space-y-3 px-2">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500 font-medium tracking-wide">Transfer Amount</span>
                  <span className="font-bold text-surface-900">{formatCurrency(simulationData.amount || amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500 font-medium tracking-wide">Fees</span>
                  <span className="font-bold text-surface-900">{formatCurrency(simulationData.fees || 0)}</span>
                </div>
                <div className="pt-3 mt-1 border-t border-surface-100 flex justify-between">
                  <span className="text-base font-black text-surface-900">Total Debit</span>
                  <span className="text-lg font-black text-danger-600">
                    {formatCurrency(simulationData.totalDebit || amount)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-surface-500 text-center leading-relaxed mt-4 bg-surface-50 p-3 rounded-xl">
                An OTP will be sent to the registered mobile number to confirm this transaction.
              </p>
            </div>
          )}

          {step === 'otp' && (
            <div className="py-4 space-y-6 animate-fade-in flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-aura-50 flex items-center justify-center text-xl mb-2">
                🔐
              </div>
              <div>
                <h4 className="text-sm font-bold text-surface-900 mb-1">Enter Verification Code</h4>
                <p className="text-xs text-surface-500 leading-relaxed">
                  We sent a 6-digit code to your registered mobile number: <br/>
                  <span className="font-bold text-surface-700 tracking-widest">{mobileNumber}</span>
                </p>
              </div>
              <input
                type="text"
                placeholder="000000"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-48 text-center text-2xl font-black tracking-[0.5em] bg-surface-50 border border-surface-200 rounded-xl py-3 text-aura-900 focus:outline-none focus:ring-2 focus:ring-aura-500 placeholder-surface-300 transition-shadow"
              />
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 flex flex-col items-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-success-50 flex items-center justify-center text-4xl mb-5 shadow-inner border border-success-100">
                ✅
              </div>
              <h4 className="text-xl font-black text-surface-900 mb-2">Transfer Successful</h4>
              <p className="text-sm text-surface-500 text-center">
                Your invisible savings move was completed securely via the official Wallet network.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 pb-5 pt-2">
          <PrimaryButton
            fullWidth
            onClick={handleAction}
            loading={loading}
          >
            {getButtonLabel()}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

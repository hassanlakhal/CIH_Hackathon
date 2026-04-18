import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TransactionFlow from '../ui/TransactionFlow.jsx';
import PrimaryButton from '../ui/PrimaryButton.jsx';
import { getAuraContractId, getStoredUserIdentity } from '../../utils/userIdentity.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
import * as api from '../../services/transactionService.js';

// ─── Form Components ────────────────────────────────────────────────────────

function CashInForm({ onSubmit, isSubmitting, contractId, phone }) {
  const [amount, setAmount] = useState('100');
  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({ contractId, level: '2', phoneNumber: phone, amount, fees: '0' });
    }} className="p-4 space-y-4">
      <div className="bg-white p-4 rounded-xl border border-surface-200">
        <label className="block text-sm font-semibold text-surface-700 mb-1">Amount (MAD)</label>
        <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
          className="w-full text-2xl font-bold bg-transparent border-b-2 border-surface-200 py-2 focus:border-primary-500 focus:outline-none placeholder:text-surface-300"
          placeholder="0.00" />
      </div>
      <PrimaryButton type="submit" fullWidth isLoading={isSubmitting}>Continue</PrimaryButton>
    </form>
  );
}

function CashOutForm({ onSubmit, isSubmitting, phone }) {
  const [amount, setAmount] = useState('100');
  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({ phoneNumber: phone, amount, fees: '0' });
    }} className="p-4 space-y-4">
      <div className="bg-white p-4 rounded-xl border border-surface-200">
        <label className="block text-sm font-semibold text-surface-700 mb-1">Amount to Withdraw</label>
        <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
          className="w-full text-2xl font-bold bg-transparent border-b-2 border-surface-200 py-2 focus:border-primary-500 focus:outline-none" />
      </div>
      <PrimaryButton type="submit" fullWidth isLoading={isSubmitting}>Continue</PrimaryButton>
    </form>
  );
}

function W2WForm({ onSubmit, isSubmitting, contractId, phone }) {
  const [amount, setAmount] = useState('50');
  const [destPhone, setDestPhone] = useState('');
  return (
    <form onSubmit={e => {
      e.preventDefault();
      // Note the official casing from doc: 'amout', 'clentNote'
      onSubmit({ clentNote: 'W2W', contractId, amout: amount, fees: '0', destinationPhone: destPhone, mobileNumber: phone });
    }} className="p-4 space-y-4">
      <div className="bg-white p-4 rounded-xl border border-surface-200 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1">Recipient Phone</label>
          <input type="tel" value={destPhone} onChange={e => setDestPhone(e.target.value)} required placeholder="212600000000"
            className="w-full text-lg bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 focus:border-primary-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1">Amount</label>
          <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
            className="w-full text-2xl font-bold bg-transparent border-b-2 border-surface-200 py-2 focus:border-primary-500 focus:outline-none" />
        </div>
      </div>
      <PrimaryButton type="submit" fullWidth isLoading={isSubmitting}>Continue</PrimaryButton>
    </form>
  );
}

function TransferForm({ onSubmit, isSubmitting, contractId, phone }) {
  const [amount, setAmount] = useState('500');
  const [rib, setRib] = useState('');
  const [destPhone, setDestPhone] = useState('');
  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({
        clientNote: 'Virement',
        ContractId: contractId,
        Amount: amount,
        destinationPhone: destPhone,
        mobileNumber: phone,
        RIB: rib
      });
    }} className="p-4 space-y-4">
      <div className="bg-white p-4 rounded-xl border border-surface-200 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1">Beneficiary RIB</label>
          <input type="text" value={rib} onChange={e => setRib(e.target.value)} required maxLength={24} placeholder="24-digit RIB"
            className="w-full text-sm font-mono tracking-wider bg-surface-50 border border-surface-200 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1">Beneficiary Phone</label>
          <input type="tel" value={destPhone} onChange={e => setDestPhone(e.target.value)} required placeholder="212600000000"
            className="w-full text-lg bg-surface-50 border border-surface-200 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1">Amount (MAD)</label>
          <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
            className="w-full text-2xl font-bold bg-transparent border-b-2 border-surface-200 py-2 focus:border-primary-500 focus:outline-none" />
        </div>
      </div>
      <PrimaryButton type="submit" fullWidth isLoading={isSubmitting}>Continue</PrimaryButton>
    </form>
  );
}

function AtmForm({ onSubmit, isSubmitting, contractId }) {
  const [amount, setAmount] = useState('100');
  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({ ContractId: contractId, Amount: amount });
    }} className="p-4 space-y-4">
      <div className="bg-white p-4 rounded-xl border border-surface-200">
        <label className="block text-sm font-semibold text-surface-700 mb-1">Enter Amount</label>
        <input type="number" min="100" step="100" value={amount} onChange={e => setAmount(e.target.value)} required
          className="w-full text-2xl font-bold bg-transparent border-b-2 border-surface-200 py-2 focus:border-primary-500 focus:outline-none" />
      </div>
      <PrimaryButton type="submit" fullWidth isLoading={isSubmitting}>Continue</PrimaryButton>
    </form>
  );
}

function W2MForm({ onSubmit, isSubmitting, contractId, phone }) {
  const [amount, setAmount] = useState('250');
  const [merchantPhone, setMerchantPhone] = useState('');
  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({
        clientContractId: contractId,
        clientPhoneNumber: phone,
        merchantPhoneNumber: merchantPhone,
        Amout: amount, // Official casing
        clientNote: 'Store Payment'
      });
    }} className="p-4 space-y-4">
      <div className="bg-white p-4 rounded-xl border border-surface-200 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1">Merchant Phone</label>
          <input type="tel" value={merchantPhone} onChange={e => setMerchantPhone(e.target.value)} required placeholder="212688888888"
            className="w-full text-lg bg-surface-50 border border-surface-200 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-surface-700 mb-1">Amount</label>
          <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
            className="w-full text-2xl font-bold bg-transparent border-b-2 border-surface-200 py-2 focus:border-primary-500 focus:outline-none" />
        </div>
      </div>
      <PrimaryButton type="submit" fullWidth isLoading={isSubmitting}>Continue</PrimaryButton>
    </form>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TransactionAction() {
  const { type } = useParams();
  const navigate = useNavigate();
  const contractId = getAuraContractId() || '';
  const identity = getStoredUserIdentity() || {};
  const phone = identity.phoneNumber || '';

  const handleCancel = () => navigate('/transactions', { replace: true });

  // ═══════════════════════════════════════════════════════════════
  // CASH IN
  // ═══════════════════════════════════════════════════════════════
  if (type === 'cash-in') {
    return (
      <TransactionFlow
        title="Cash In"
        requiresOtp={false}
        onCancel={handleCancel}
        renderForm={(onSubmit, isSubmitting) => <CashInForm onSubmit={onSubmit} isSubmitting={isSubmitting} contractId={contractId} phone={phone} />}
        onSimulate={api.simulateCashIn}
        renderSimulation={(sim, onConfirm, isSubmitting) => (
          <div className="p-4 space-y-4 text-center">
            <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
              <h3 className="text-surface-500 font-medium mb-1">You will add</h3>
              <p className="text-3xl font-bold text-surface-900">{formatCurrency(sim.result?.amountToCollect || 0)}</p>
              <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-surface-100">
                <span className="text-surface-500">Fees</span>
                <span className="font-semibold text-surface-800">{formatCurrency(sim.result?.Fees || '0')}</span>
              </div>
            </div>
            <PrimaryButton onClick={onConfirm} fullWidth isLoading={isSubmitting}>Confirm Cash In</PrimaryButton>
          </div>
        )}
        onConfirm={(payload, sim) => api.confirmCashIn({ token: sim.result.token, amount: payload.amount, fees: payload.fees })}
        renderSuccess={(res, onDone) => (
          <SuccessView title="Cash In Successful" details={[
            { label: 'Amount', value: formatCurrency(res.result?.amount || 0) },
            { label: 'Ref', value: res.result?.transactionReference || 'N/A' }
          ]} onDone={onDone} />
        )}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CASH OUT
  // ═══════════════════════════════════════════════════════════════
  if (type === 'cash-out') {
    return (
      <TransactionFlow
        title="Cash Out"
        requiresOtp={true}
        onCancel={handleCancel}
        renderForm={(onSubmit, isSubmitting) => <CashOutForm onSubmit={onSubmit} isSubmitting={isSubmitting} phone={phone} />}
        onSimulate={api.simulateCashOut}
        renderSimulation={(sim, onConfirm, isSubmitting) => (
          <div className="p-4 space-y-4 text-center">
            <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
              <h3 className="text-surface-500 font-medium mb-1">Withdrawal Amount</h3>
              <p className="text-3xl font-bold text-surface-900">{formatCurrency(sim.result?.amountToCollect || 0)}</p>
            </div>
            <PrimaryButton onClick={onConfirm} fullWidth isLoading={isSubmitting}>Verify & Confirm</PrimaryButton>
          </div>
        )}
        onRequestOtp={(payload) => api.requestCashOutOtp({ phoneNumber: payload.phoneNumber })}
        onConfirm={(payload, sim, otp) => api.confirmCashOut({ token: sim.result.token, phoneNumber: payload.phoneNumber, otp, amount: payload.amount, fees: payload.fees })}
        renderSuccess={(res, onDone) => (
           <SuccessView title="Cash Out Complete" details={[{ label: 'Ref', value: res.result?.transactionReference || 'N/A' }]} onDone={onDone} />
        )}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // WALLET TO WALLET (W2W)
  // ═══════════════════════════════════════════════════════════════
  if (type === 'wallet-to-wallet') {
    return (
      <TransactionFlow
        title="Send to Wallet"
        requiresOtp={true}
        onCancel={handleCancel}
        renderForm={(onSubmit, isSubmitting) => <W2WForm onSubmit={onSubmit} isSubmitting={isSubmitting} contractId={contractId} phone={phone} />}
        onSimulate={api.simulateW2W}
        renderSimulation={(sim, onConfirm, isSubmitting) => (
          <div className="p-4 space-y-4 text-center">
            <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
              <h3 className="text-surface-500 font-medium mb-1">Sending to {sim.result?.beneficiaryFirstName} {sim.result?.beneficiaryLastName}</h3>
              <p className="text-3xl font-bold text-surface-900">{formatCurrency(sim.result?.amount || 0)}</p>
              <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-surface-100">
                <span className="text-surface-500">Total with Fees</span>
                <span className="font-semibold text-surface-800">{formatCurrency(sim.result?.totalAmount || '0')}</span>
              </div>
            </div>
            <PrimaryButton onClick={onConfirm} fullWidth isLoading={isSubmitting}>Verify & Confirm</PrimaryButton>
          </div>
        )}
        onRequestOtp={(payload) => api.requestW2WOtp({ phoneNumber: payload.mobileNumber })}
        onConfirm={(payload, sim, otp) => api.confirmW2W({
          mobileNumber: payload.mobileNumber,
          contractId: payload.contractId,
          otp,
          referenceId: sim.result.referenceId,
          destinationPhone: payload.destinationPhone,
          fees: payload.fees
        })}
        renderSuccess={(res, onDone) => (
          <SuccessView title="Transfer Sent" details={[{ label: 'Status', value: res.result?.item3 || 'N/A' }]} onDone={onDone} />
        )}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER (VIREMENT)
  // ═══════════════════════════════════════════════════════════════
  if (type === 'transfer') {
    return (
      <TransactionFlow
        title="Bank Transfer"
        requiresOtp={true}
        onCancel={handleCancel}
        renderForm={(onSubmit, isSubmitting) => <TransferForm onSubmit={onSubmit} isSubmitting={isSubmitting} contractId={contractId} phone={phone} />}
        onSimulate={api.simulateTransfer}
        renderSimulation={(sim, onConfirm, isSubmitting) => {
          const amount = sim.result?.[0]?.totalAmountWithFee || 0;
          return (
            <div className="p-4 space-y-4 text-center">
              <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
                <h3 className="text-surface-500 font-medium mb-1">Sending via Virement</h3>
                <p className="text-3xl font-bold text-surface-900">{formatCurrency(amount)}</p>
              </div>
              <PrimaryButton onClick={onConfirm} fullWidth isLoading={isSubmitting}>Verify & Confirm</PrimaryButton>
            </div>
          );
        }}
        onRequestOtp={(payload) => api.requestTransferOtp({ PhoneNumber: payload.mobileNumber })}
        onConfirm={(payload, sim, otp) => api.confirmTransfer({
          mobileNumber: payload.mobileNumber,
          ContractId: payload.ContractId,
          Otp: otp,
          referenceId: "0152475499", // Note: mock hardcoded in KIT
          destinationPhone: payload.destinationPhone,
          fees: "0",
          Amount: payload.Amount,
          RIB: payload.RIB,
          NumBeneficiaire: payload.destinationPhone,
          DestinationFirstName: "N/A",
          DestinationLastName: "N/A"
        })}
        renderSuccess={(res, onDone) => (
          <SuccessView title="Transfer Sent" details={[{ label: 'Ref', value: res.result?.reference || 'N/A' }]} onDone={onDone} />
        )}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ATM WITHDRAWAL
  // ═══════════════════════════════════════════════════════════════
  if (type === 'atm') {
    return (
      <TransactionFlow
        title="ATM Withdrawal"
        requiresOtp={true}
        onCancel={handleCancel}
        renderForm={(onSubmit, isSubmitting) => <AtmForm onSubmit={onSubmit} isSubmitting={isSubmitting} contractId={contractId} />}
        onSimulate={api.simulateAtm}
        renderSimulation={(sim, onConfirm, isSubmitting) => (
          <div className="p-4 space-y-4 text-center">
            <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
              <h3 className="text-surface-500 font-medium mb-1">Total Output</h3>
              <p className="text-3xl font-bold text-surface-900">{formatCurrency(sim.result?.totalAmount || 0)}</p>
              <p className="text-xs text-surface-400 mt-2">Includes {formatCurrency(sim.result?.totalFrai || '0')} in fees</p>
            </div>
            <PrimaryButton onClick={onConfirm} fullWidth isLoading={isSubmitting}>Verify & Confirm</PrimaryButton>
          </div>
        )}
        onRequestOtp={() => api.requestAtmOtp({ phoneNumber: phone })}
        onConfirm={(payload, sim, otp) => api.confirmAtm({
          ContractId: payload.ContractId,
          PhoneNumberBeneficiary: phone,
          Token: sim.result.token,
          ReferenceId: sim.result.referenceId,
          Otp: otp
        })}
        renderSuccess={(res, onDone) => (
          <SuccessView title="ATM Request Ready" details={[
            { label: 'Token', value: res.result?.token ? res.result.token.substring(0, 16) + '...' : 'N/A' },
            { label: 'CIH Ref', value: res.result?.transfertCihExpressReference || 'N/A' }
          ]} onDone={onDone} />
        )}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // WALLET TO MERCHANT (W2M)
  // ═══════════════════════════════════════════════════════════════
  if (type === 'wallet-to-merchant') {
    return (
      <TransactionFlow
        title="Pay Merchant"
        requiresOtp={true}
        onCancel={handleCancel}
        renderForm={(onSubmit, isSubmitting) => <W2MForm onSubmit={onSubmit} isSubmitting={isSubmitting} contractId={contractId} phone={phone} />}
        onSimulate={api.simulateW2M}
        renderSimulation={(sim, onConfirm, isSubmitting) => (
          <div className="p-4 space-y-4 text-center">
            <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
              <h3 className="text-surface-500 font-medium mb-1">Pay {sim.result?.beneficiaryFirstName} {sim.result?.beneficiaryLastName}</h3>
              <p className="text-3xl font-bold text-surface-900">{formatCurrency(sim.result?.totalAmount || 0)}</p>
            </div>
            <PrimaryButton onClick={onConfirm} fullWidth isLoading={isSubmitting}>Verify & Pay</PrimaryButton>
          </div>
        )}
        onRequestOtp={(payload) => api.requestW2MOtp({ phoneNumber: payload.clientPhoneNumber })}
        onConfirm={(payload, sim, otp) => api.confirmW2M({
          ClientPhoneNumber: payload.clientPhoneNumber,
          ClientContractId: payload.clientContractId,
          OTP: otp,
          ReferenceId: sim.result.referenceId,
          DestinationPhone: payload.merchantPhoneNumber,
          fees: "0"
        })}
        renderSuccess={(res, onDone) => (
          <SuccessView title="Payment Sent" details={[{ label: 'Status', value: 'Successful' }]} onDone={onDone} />
        )}
      />
    );
  }

  // Not found fallback
  return (
    <div className="p-5 pt-12 text-center text-surface-500">
      Unknown transaction type.
      <button onClick={handleCancel} className="block w-full py-3 mt-4 font-bold text-primary-600">Go Back</button>
    </div>
  );
}

// ─── Reusable Success View ─────────────────────────────────────────

function SuccessView({ title, details, onDone }) {
  return (
    <div className="p-5 text-center pt-8">
      <div className="w-20 h-20 bg-success-50 text-success-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-surface-900 mb-2">{title}</h2>
      <p className="text-surface-500 mb-8 max-w-xs mx-auto">
        Your transaction has been securely processed and confirmed.
      </p>
      
      {details?.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden mb-8">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between items-center p-4 border-b border-surface-100 last:border-0">
              <span className="text-surface-500 font-medium">{d.label}</span>
              <span className="text-surface-900 font-bold truncate max-w-[200px]">{d.value}</span>
            </div>
          ))}
        </div>
      )}
      
      <PrimaryButton onClick={onDone} fullWidth>Back to Transactions</PrimaryButton>
    </div>
  );
}

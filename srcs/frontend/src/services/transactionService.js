import { apiGet, apiPost } from './api.js';

/**
 * Transaction Service — Mirrors the official Wallet Management KIT API.
 * All these bypass mocks and hit the real backend implementation.
 */

// ─── GET /wallet/operations?contractid=... ──────────────────
export function getWalletOperations(contractid) {
  return apiGet('/wallet/operations', { contractid });
}

// ─── GET /wallet/balance?contractid=... ─────────────────────
export function getWalletBalance(contractid) {
  return apiGet('/wallet/balance', { contractid });
}

// ═══════════════════════════════════════════════════════════════
// 1. CASH IN
// ═══════════════════════════════════════════════════════════════

export function simulateCashIn(payload) {
  return apiPost('/wallet/cash/in', payload, { step: 'simulation' });
}

export function confirmCashIn(payload) {
  return apiPost('/wallet/cash/in', payload, { step: 'confirmation' });
}

// ═══════════════════════════════════════════════════════════════
// 2. CASH OUT
// ═══════════════════════════════════════════════════════════════

export function simulateCashOut(payload) {
  return apiPost('/wallet/cash/out', payload, { step: 'simulation' });
}

export function requestCashOutOtp(payload) {
  return apiPost('/wallet/cash/out/otp', payload);
}

export function confirmCashOut(payload) {
  return apiPost('/wallet/cash/out', payload, { step: 'confirmation' });
}

// ═══════════════════════════════════════════════════════════════
// 3. WALLET TO WALLET (W2W)
// ═══════════════════════════════════════════════════════════════

export function simulateW2W(payload) {
  return apiPost('/wallet/transfer/wallet', payload, { step: 'simulation' });
}

export function requestW2WOtp(payload) {
  return apiPost('/wallet/transfer/wallet/otp', payload);
}

export function confirmW2W(payload) {
  return apiPost('/wallet/transfer/wallet', payload, { step: 'confirmation' });
}

// ═══════════════════════════════════════════════════════════════
// 4. TRANSFER (VIREMENT)
// ═══════════════════════════════════════════════════════════════

export function simulateTransfer(payload) {
  return apiPost('/wallet/transfer/virement', payload, { step: 'simulation' });
}

export function requestTransferOtp(payload) {
  return apiPost('/wallet/transfer/virement/otp', payload);
}

export function confirmTransfer(payload) {
  return apiPost('/wallet/transfer/virement', payload, { step: 'confirmation' });
}

// ═══════════════════════════════════════════════════════════════
// 5. ATM WITHDRAWAL
// ═══════════════════════════════════════════════════════════════

export function simulateAtm(payload) {
  return apiPost('/wallet/cash/gab/out', payload, { step: 'simulation' });
}

export function requestAtmOtp(payload) {
  return apiPost('/wallet/cash/gab/otp', payload);
}

export function confirmAtm(payload) {
  return apiPost('/wallet/cash/gab/out', payload, { step: 'confirmation' });
}

// ═══════════════════════════════════════════════════════════════
// 6. WALLET TO MERCHANT (W2M)
// ═══════════════════════════════════════════════════════════════

export function simulateW2M(payload) {
  return apiPost('/wallet/Transfer/WalletToMerchant', payload, { step: 'simulation' });
}

export function requestW2MOtp(payload) {
  return apiPost('/wallet/walletToMerchant/cash/out/otp', payload);
}

export function confirmW2M(payload) {
  return apiPost('/wallet/Transfer/WalletToMerchant', payload, { step: 'confirmation' });
}

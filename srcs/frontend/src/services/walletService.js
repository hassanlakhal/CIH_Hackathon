/**
 * Wallet Service — mirrors the official Wallet Management KIT API.
 *
 * Each function corresponds to an official API endpoint.
 * When the backend is unavailable, mock responses are returned instead.
 *
 * Official endpoints:
 *   POST /wallet?state=precreate           → body = client registration fields
 *   POST /wallet?state=activate            → body = { token, otp }
 *   POST /wallet/clientinfo
 *   GET  /wallet/operations?contractid=...
 *   GET  /wallet/balance?contractid=...
 *   POST /wallet/transfer/virement?step=simulation
 *   POST /wallet/transfer/virement/otp
 *   POST /wallet/transfer/virement?step=confirmation
 */

import { apiGet, apiPost } from './api.js';
import {
  mockPrecreateWallet,
  mockActivateWallet,
  mockGetClientInfo,
  mockGetWalletOperations,
  mockGetWalletBalance,
  mockSimulateBankTransfer,
  mockSendTransferOtp,
  mockConfirmBankTransfer,
} from '../mocks/walletMock.js';

/** Set to true to always use mocks (e.g. demo mode, no backend). */
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

/**
 * Try a real API call; if it fails (network, 5xx, etc.), fall back to mock.
 */
async function withFallback(apiFn, mockFn) {
  if (USE_MOCKS) return mockFn();
  try {
    return await apiFn();
  } catch {
    console.warn('[walletService] API unavailable, using mock fallback.');
    return mockFn();
  }
}

// ─── POST /wallet?state=precreate ────────────────────────────
// Body contains official registration fields (phoneNumber, clientFirstName, etc.)
// state is a query parameter, NOT in the body.
export function precreateWallet(payload) {
  // Bypassing mocks: hitting real backend directly
  return apiPost('/wallet', payload, { state: 'precreate' });
}

// ─── POST /wallet?state=activate ─────────────────────────────
// Body contains { token, otp }
export function activateWallet(payload) {
  // Bypassing mocks: hitting real backend directly
  return apiPost('/wallet', payload, { state: 'activate' });
}

// ─── POST /wallet/clientinfo ────────────────────────────────
export function getClientInfo(payload) {
  return withFallback(
    () => apiPost('/wallet/clientinfo', payload),
    () => mockGetClientInfo(payload)
  );
}

// ─── GET /wallet/operations?contractid=... ──────────────────
export function getWalletOperations(contractid) {
  return withFallback(
    () => apiGet('/wallet/operations', { contractid }),
    () => mockGetWalletOperations(contractid)
  );
}

// ─── GET /wallet/balance?contractid=... ─────────────────────
export function getWalletBalance(contractid) {
  return withFallback(
    () => apiGet('/wallet/balance', { contractid }),
    () => mockGetWalletBalance(contractid)
  );
}

// ─── POST /wallet/transfer/virement?step=simulation ────────
export function simulateBankTransfer(payload) {
  return withFallback(
    () => apiPost('/wallet/transfer/virement', payload, { step: 'simulation' }),
    () => mockSimulateBankTransfer(payload)
  );
}

// ─── POST /wallet/transfer/virement/otp ────────────────────
export function sendTransferOtp(payload) {
  return withFallback(
    () => apiPost('/wallet/transfer/virement/otp', payload),
    () => mockSendTransferOtp(payload)
  );
}

// ─── POST /wallet/transfer/virement?step=confirmation ──────
export function confirmBankTransfer(payload) {
  return withFallback(
    () => apiPost('/wallet/transfer/virement', payload, { step: 'confirmation' }),
    () => mockConfirmBankTransfer(payload)
  );
}

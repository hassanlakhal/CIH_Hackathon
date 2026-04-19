import { apiGet, apiPost, apiPatch } from './api.js';
import {
  mockPrecreateWallet,
  mockActivateWallet,
  mockGetClientInfo,
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
export function precreateWallet(payload) {
  return apiPost('/wallet/', payload, { state: 'precreate' });
}

// ─── POST /wallet?state=activate ─────────────────────────────
export function activateWallet(payload) {
  return apiPost('/wallet/', payload, { state: 'activate' });
}

// ─── POST /wallet/clientinfo ────────────────────────────────
export function getClientInfo(payload) {
  return apiPost('/wallet/clientinfo', payload);
}

// ─── Survey Endpoints ────────────────────────────────────────

export async function getSurvey(token) {
  return await apiGet('/wallet/survey', { token });
}

export async function submitSurvey(payload) {
  return await apiPost('/wallet/survey', payload);
}


// ═══════════════════════════════════════════════════════════════
// AI Financial Coaching Endpoints
// ═══════════════════════════════════════════════════════════════

// ─── Insights ────────────────────────────────────────────────

/** Trigger AI insight generation */
export async function triggerInsight(token) {
  return await apiPost('/wallet/insight', { token });
}

/** Fetch latest insight + goals */
export async function getInsight(token) {
  return await apiGet('/wallet/insight', { token });
}

// ─── Goals ───────────────────────────────────────────────────

/** List all goals for a wallet */
export async function getGoals(token) {
  return await apiGet('/wallet/goals', { token });
}

/** Create a new savings goal */
export async function createGoal(payload) {
  return await apiPost('/wallet/goals', payload);
}

/** Update a savings goal (pause, change target, etc.) */
export async function updateGoal(goalId, payload) {
  return await apiPatch(`/wallet/goals/${goalId}`, payload);
}

// ─── Auto-Save Rules ─────────────────────────────────────────

/** List auto-save rules */
export async function getAutoSaveRules(token) {
  return await apiGet('/wallet/auto-save', { token });
}

/** Create an auto-save rule */
export async function createAutoSaveRule(payload) {
  return await apiPost('/wallet/auto-save', payload);
}

// ─── Health Scores ───────────────────────────────────────────

/** Get health score history */
export async function getHealthScores(token) {
  return await apiGet('/wallet/health', { token });
}

// ─── Settings ────────────────────────────────────────────────

/** Get wallet settings */
export async function getWalletSettings(token) {
  return await apiGet('/wallet/settings', { token });
}

/** Update wallet settings */
export async function updateWalletSettings(payload) {
  return await apiPost('/wallet/settings', payload);
}


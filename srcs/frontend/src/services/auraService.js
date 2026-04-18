/**
 * Aura Service — higher-level frontend logic built on top of the Wallet KIT.
 *
 * Provides dashboard views, invisible moves feed, and Aura-specific settings.
 * Keeps official wallet data separate from derived UI data.
 */

import { getWalletBalance, getWalletOperations } from './transactionService.js';
import {
  mockGetAuraSettings,
  mockUpdateAuraSettings,
  mockGetPredictedExpenses,
  mockGetAuraDecisions,
} from '../mocks/auraMock.js';
import {
  transformBalanceForUI,
  transformOperationsForUI,
  extractInvisibleMoves,
  computeDashboardMetrics,
} from '../utils/transformApiData.js';

/**
 * Fetch and assemble all data needed for the Dashboard page.
 * @param {string} contractId
 * @returns {Promise<object>} Combined dashboard view data.
 */
export async function getDashboardView(contractId) {
  const [operationsRes, settingsRes, predictionsRes] =
    await Promise.all([
      getWalletOperations(contractId).catch(() => null),
      mockGetAuraSettings(),
      mockGetPredictedExpenses(),
    ]);

  let balanceRes = null;
  try {
    // Attempt to hit the real endpoint using the inherited contractId
    balanceRes = await getWalletBalance(contractId);
  } catch (err) {
    console.warn('Real balance failed to fetch inside auraService view logic:', err);
  }

  const balance = transformBalanceForUI(balanceRes);
  const operations = transformOperationsForUI(operationsRes);
  const invisibleMoves = extractInvisibleMoves(operations);
  const metrics = computeDashboardMetrics(
    balance,
    operations,
    settingsRes.settings
  );

  return {
    balance,
    operations,
    invisibleMoves,
    metrics,
    settings: settingsRes.settings,
    predictions: predictionsRes.predictions,
  };
}

/**
 * Fetch the activity feed of invisible (automatic) savings moves.
 * @param {string} contractId
 * @returns {Promise<object[]>} Array of invisible move items.
 */
export async function getInvisibleMovesFeed(contractId) {
  const operationsRes = await getWalletOperations(contractId);
  const operations = transformOperationsForUI(operationsRes);
  return extractInvisibleMoves(operations);
}

/**
 * Fetch Aura's internal decisions feed (simulations, skips, etc.)
 */
export async function getAuraDecisionsFeed() {
  const res = await mockGetAuraDecisions();
  return res.decisions;
}

/**
 * Fetch Aura-specific settings (savings rules, goals, notifications).
 * @returns {Promise<object>}
 */
export async function getAuraSettings() {
  const res = await mockGetAuraSettings();
  return res.settings;
}

/**
 * Update Aura-specific settings.
 * @param {object} payload - Settings to update.
 * @returns {Promise<object>}
 */
export async function updateAuraSettings(payload) {
  return mockUpdateAuraSettings(payload);
}

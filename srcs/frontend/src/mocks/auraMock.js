/**
 * Mock data for Aura-specific (non-official API) features.
 * This covers derived data like savings settings, goals, and predictions.
 */

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Aura settings ──────────────────────────────────────────
export async function mockGetAuraSettings() {
  await delay();
  return {
    status: 'success',
    settings: {
      savingsEnabled: true,
      roundUpEnabled: true,
      weeklyTransferEnabled: true,
      weeklyTransferAmount: 50.00,
      safetyFloor: 200.00,
      savingsGoal: 5000.00,
      savingsGoalLabel: 'Objectif fin d\'année',
      notificationsEnabled: true,
      currency: 'MAD',
    },
  };
}

// ─── Update Aura settings ───────────────────────────────────
export async function mockUpdateAuraSettings(/* payload */) {
  await delay(300);
  return {
    status: 'success',
    message: 'Paramètres mis à jour avec succès.',
  };
}

// ─── Predicted recurring expenses ───────────────────────────
export async function mockGetPredictedExpenses() {
  await delay(300);
  return {
    status: 'success',
    predictions: [
      {
        id: 'pred_001',
        label: 'Loyer résidence',
        amount: 1200.00,
        dueDate: '2026-04-25',
        confidence: 0.95,
        category: 'housing',
      },
      {
        id: 'pred_002',
        label: 'Abonnement Inwi',
        amount: 99.00,
        dueDate: '2026-04-22',
        confidence: 0.90,
        category: 'telecom',
      },
      {
        id: 'pred_003',
        label: 'Transport (Tramway)',
        amount: 150.00,
        dueDate: '2026-04-28',
        confidence: 0.80,
      },
    ],
  };
}

// ─── Aura Decisions (Invisible feed) ───────────────────────────
export async function mockGetAuraDecisions() {
  await delay(400);
  const now = new Date();
  
  return {
    status: 'success',
    decisions: [
      {
        id: 'dec_001',
        type: 'aura_move',
        amount: 25.00,
        date: new Date(now.getTime() - 1 * 86400000).toISOString(),
        status: 'skipped',
        reason: 'Safety floor risk',
        explanation: 'Your balance is too close to your 200 MAD safety floor.',
      },
      {
        id: 'dec_002',
        type: 'aura_move',
        amount: 15.00,
        date: new Date(now.getTime() - 2 * 86400000).toISOString(),
        status: 'simulated',
        reason: 'Analyzing spending pattern',
        explanation: 'Testing whether small continuous roundups are safe this week.',
      },
      {
        id: 'dec_003',
        type: 'aura_move',
        amount: 12.50,
        date: new Date(now.getTime() - 3 * 86400000).toISOString(),
        status: 'completed',
        reason: 'Automated round-up',
        explanation: 'Successfully gathered roundups from yesterday\'s coffee and lunch.',
      },
      {
        id: 'dec_004',
        type: 'aura_move',
        amount: 50.00,
        date: new Date(now.getTime() - 5 * 86400000).toISOString(),
        status: 'skipped',
        reason: 'High upcoming expenses',
        explanation: 'We detected a likely 150 MAD transit expense soon.',
      }
    ]
  };
}

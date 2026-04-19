/**
 * User Identity Storage — minimal helpers for persisting onboarded user data.
 *
 * Stores a single structured object in localStorage under 'aura_user_identity'.
 * This object holds the fields required by POST /wallet/clientinfo and
 * additional wallet data accumulated during the onboarding/activation flow.
 *
 * Shape:
 * {
 *   phoneNumber,            // e.g. "212700446631"
 *   identificationType,     // maps from onboarding legalType → e.g. "CIN"
 *   identificationNumber,   // maps from onboarding legalId   → e.g. "BK12232"
 *   token,                  // pre-registration token (temporary)
 *   contractId,             // set after activation
 *   rib,                    // set after activation
 *   firstName,              // from onboarding form
 *   lastName,               // from onboarding form
 * }
 */

const STORAGE_KEY = 'aura_user_identity';

/**
 * Read the full stored user identity object.
 * @returns {object|null}
 */
export function getStoredUserIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Overwrite the stored user identity with a complete object.
 * @param {object} data
 */
export function saveStoredUserIdentity(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Merge partial updates into the existing stored identity.
 * Creates a new entry if none exists yet.
 * @param {object} partialData
 */
export function updateStoredUserIdentity(partialData) {
  const current = getStoredUserIdentity() || {};
  saveStoredUserIdentity({ ...current, ...partialData });
}

// ─── Contract ID helpers ────────────────────────────────────
// The 'aura_contract_id' localStorage key is the single source of truth
// for the activated wallet's contract ID, used by all wallet API calls.

const CONTRACT_KEY = 'aura_contract_id';

/**
 * Read the activated wallet contract ID from localStorage.
 * @returns {string|null} The contract ID, or null if missing/invalid.
 */
export function getAuraContractId() {
  try {
    const val = localStorage.getItem(CONTRACT_KEY);
    const trimmed = val?.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

/**
 * Store the activated wallet contract ID.
 * @param {string} contractId
 */
export function setAuraContractId(contractId) {
  localStorage.setItem(CONTRACT_KEY, contractId);
}

/**
 * Remove the stored contract ID (e.g. on logout or reset).
 */
export function clearAuraContractId() {
  localStorage.removeItem(CONTRACT_KEY);
}

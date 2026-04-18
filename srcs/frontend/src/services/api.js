/**
 * API base configuration and request helpers.
 * Uses VITE_API_BASE_URL environment variable or a placeholder fallback.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://placeholder-api.aura.local';

/**
 * Build a URL with query parameters.
 * @param {string} path - The API endpoint path.
 * @param {object} params - Query parameters as key-value pairs.
 * @returns {string} Full URL string.
 */
function buildUrl(path, params = {}) {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

/**
 * Generic GET request helper.
 * @param {string} path - Endpoint path.
 * @param {object} params - Query parameters.
 * @returns {Promise<object>} Parsed JSON response.
 */
export async function apiGet(path, params = {}) {
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error(`GET ${path} failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Generic POST request helper.
 * @param {string} path - Endpoint path.
 * @param {object} body - Request body (JSON).
 * @param {object} params - Query parameters.
 * @returns {Promise<object>} Parsed JSON response.
 */
export async function apiPost(path, body = {}, params = {}) {
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = new Error(`POST ${path} failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

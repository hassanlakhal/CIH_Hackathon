/**
 * API base configuration and request helpers.
 * Uses VITE_API_BASE_URL environment variable or a placeholder fallback.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

/**
 * Build a URL with query parameters.
 * @param {string} path - The API endpoint path.
 * @param {object} params - Query parameters as key-value pairs.
 * @returns {string} Full URL string.
 */
function buildUrl(path, params = {}) {
  // Ensure base URL ends with a slash and path does not start with one
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  const url = new URL(cleanPath, baseUrl);
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
    let errorMsg = `GET ${path} failed: ${response.status}`;
    try {
      const rawText = await response.text();
      try {
        const errBody = JSON.parse(rawText);
        
        // Priority fields commonly used by APIs
        if (errBody.message) errorMsg = errBody.message;
        else if (errBody.error) errorMsg = errBody.error;
        else if (errBody.detail) errorMsg = errBody.detail;
        else if (typeof errBody === 'object' && errBody !== null) {
          // e.g. Django {"otp": ["Invalid OTP"]}
          const values = Object.values(errBody).flat();
          if (values.length > 0 && typeof values[0] === 'string') {
            errorMsg = values.join(', ');
          } else {
            errorMsg = rawText;
          }
        } else {
          errorMsg = rawText;
        }
      } catch {
        if (rawText) errorMsg = rawText;
      }
    } catch (e) {
      // Ignore
    }
    const error = new Error(errorMsg);
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
    let errorMsg = `POST ${path} failed: ${response.status}`;
    try {
      const rawText = await response.text();
      try {
        const errBody = JSON.parse(rawText);
        
        if (errBody.message) errorMsg = errBody.message;
        else if (errBody.error) errorMsg = errBody.error;
        else if (errBody.detail) errorMsg = errBody.detail;
        else if (typeof errBody === 'object' && errBody !== null) {
          const values = Object.values(errBody).flat();
          if (values.length > 0 && typeof values[0] === 'string') {
            errorMsg = values.join(', ');
          } else {
            errorMsg = rawText;
          }
        } else {
          errorMsg = rawText;
        }
      } catch {
        if (rawText) errorMsg = rawText;
      }
    } catch (e) {
      // Ignore
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

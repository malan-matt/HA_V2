/**
 * Server configuration — set via environment variables for deployment.
 * SERVER_API_KEY must match SUPERSECUREAPIKEY in api/config.php on Wheatley.
 */
const { buildWheatleyApiUrl } = require('./wheatley-url');

function resolveApiBaseUrl() {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, '');
  }

  return buildWheatleyApiUrl({
    host: process.env.WHEATLEY_HOST || 'wheatley.cs.up.ac.za',
    path: process.env.WHEATLEY_API_PATH || '/u25009801/public_html/api',
    user: process.env.WHEATLEY_USER || '',
    pass: process.env.WHEATLEY_PASS || '',
  });
}

module.exports = {
  API_BASE_URL: resolveApiBaseUrl(),
  SERVER_API_KEY: process.env.SERVER_API_KEY || 'your_secure_server_api_key_here',
  BOARDING_WINDOW_MS: 60000,
  ANIMATION_TICK_MS: 100,
};

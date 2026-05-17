/**
 * Build Wheatley API base URL per spec §8.8:
 * https://username:password@wheatley.cs.up.ac.za/uXXXXXXXX/public_html/api
 *
 * Credentials are optional; when omitted, returns a plain https URL.
 */
function buildWheatleyApiUrl(options = {}) {
  const host = options.host || 'wheatley.cs.up.ac.za';
  const path = (options.path || '/u25009801/public_html/api').replace(/\/$/, '');
  const user = options.user || '';
  const pass = options.pass || '';

  if (user && pass) {
    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(pass);
    return `https://${encodedUser}:${encodedPass}@${host}${path}`;
  }

  return `https://${host}${path}`;
}

module.exports = { buildWheatleyApiUrl };

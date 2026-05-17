/**
 * Build Wheatley API base URL per spec §8.8:
 * https://username:password@wheatley.cs.up.ac.za/uXXXXXXXX/public_html/api
 */
export function buildWheatleyApiUrl(options: {
  host?: string;
  path?: string;
  user?: string;
  pass?: string;
} = {}): string {
  const host = options.host ?? 'wheatley.cs.up.ac.za';
  const path = (options.path ?? '/u25009801/public_html/api').replace(/\/$/, '');
  const user = options.user ?? '';
  const pass = options.pass ?? '';

  if (user && pass) {
    return `https://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}${path}`;
  }

  return `https://${host}${path}`;
}

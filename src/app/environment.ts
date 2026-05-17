import { buildWheatleyApiUrl } from './wheatley-url';
import { wheatleyUser, wheatleyPass, wheatleyPath } from './environment.local';

/**
 * Wheatley HTTP credentials = your CS hosting account (uXXXXXXXX).
 * Flight-app users (atc_admin, passenger1) authenticate via login.php only.
 */
export const WHEATLEY_HTTP_AUTH = {
  user: wheatleyUser,
  pass: wheatleyPass,
};

/** Plain https base URL; Basic auth is added by wheatleyAuthInterceptor. */
export const API_BASE_URL = buildWheatleyApiUrl({ path: wheatleyPath });

export const isWheatleyConfigured = (): boolean =>
  Boolean(WHEATLEY_HTTP_AUTH.user && WHEATLEY_HTTP_AUTH.pass);

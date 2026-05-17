import { HttpInterceptorFn } from '@angular/common/http';
import { WHEATLEY_HTTP_AUTH } from '../environment';

/** Adds Wheatley hosting Basic auth (spec §8.8) — separate from app Bearer tokens. */
export const wheatleyAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const { user, pass } = WHEATLEY_HTTP_AUTH;
  if (!user || !pass) {
    return next(req);
  }

  const token = btoa(`${user}:${pass}`);
  return next(
    req.clone({
      setHeaders: { Authorization: `Basic ${token}` },
    })
  );
};

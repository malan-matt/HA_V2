import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRole: string = route.data['role'];

  if (auth.snapshot.user?.type === requiredRole) return true;

  if (auth.snapshot.user?.type === 'ATC') router.navigate(['/atc']);
  else if (auth.snapshot.user?.type === 'Passenger') router.navigate(['/passenger']);
  else router.navigate(['/login']);

  return false;
};

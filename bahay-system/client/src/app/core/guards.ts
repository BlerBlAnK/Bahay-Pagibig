import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Any signed-in staff member. */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSignedIn()) return true;
  return router.createUrlTree(['/admin/login'], { queryParams: { next: state.url } });
};

/** Super Admin only — User Accounts (panel item 9). */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperAdmin()) return true;
  return router.createUrlTree(['/admin/dashboard'], { queryParams: { denied: 'user-accounts' } });
};

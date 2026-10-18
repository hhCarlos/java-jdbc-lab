import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { SessionService } from './session.service';

// Navigation protection only; the API remains responsible for authorization.
const requireSession = () => inject(SessionService).getAccessToken()
  ? true
  : inject(Router).parseUrl('/auth/login');

export const authGuard: CanActivateFn = requireSession;
export const authChildGuard: CanActivateChildFn = requireSession;

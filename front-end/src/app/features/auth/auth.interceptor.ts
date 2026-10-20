import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session.service';

/** Only the root-relative API namespace handled by this application's proxy. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!request.url.startsWith('/api/') || request.url.includes('\\')) return next(request);

  // Normalize dot segments before checking the namespace and authentication exclusions.
  const path = new URL(request.url, 'http://application.local').pathname;
  if (!path.startsWith('/api/') || /^\/api\/auth\/(login|register)\/?$/.test(path)) {
    return next(request);
  }
  const token = session.getAccessToken();
  // Mirror the protected endpoints in the backend security configuration.
  const protectedRequest = (
    ['GET', 'HEAD'].includes(request.method) && /^\/api\/users(?:\/[^/]+|\/me\/products(?:\/[0-9]+)?)?$/.test(path)
  ) || (request.method === 'POST' && path === '/api/users/me/products');
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && protectedRequest &&
          token && session.getAccessToken() === token) {
        // Clearing synchronously makes concurrent failures from this token harmless.
        session.clear();
        if (!router.url.startsWith('/auth/login')) {
          void router.navigate(['/auth/login'], { replaceUrl: true });
        }
      }
      return throwError(() => error);
    }),
  );
};

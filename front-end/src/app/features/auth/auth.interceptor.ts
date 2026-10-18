import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from './session.service';

/** Only the root-relative API namespace handled by this application's proxy. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  if (!request.url.startsWith('/api/') || request.url.includes('\\')) return next(request);

  // Normalize dot segments before checking the namespace and authentication exclusions.
  const path = new URL(request.url, 'http://application.local').pathname;
  if (!path.startsWith('/api/') || /^\/api\/auth\/(login|register)\/?$/.test(path)) {
    return next(request);
  }
  const token = session.getAccessToken();
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request);
};

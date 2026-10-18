import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { RegisterRequest, RegistrationResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>('/api/auth/register', request);
  }
}

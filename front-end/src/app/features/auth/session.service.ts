import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly session = signal<{ accessToken: string; expiresAt: number } | null>(null);
  private expirationTimer: ReturnType<typeof setTimeout> | undefined;

  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  /** Establish explicitly after login succeeds; nothing is persisted across reloads. */
  establish(response: LoginResponse): void {
    this.clear();
    const expiresAt = Date.now() + response.expiresIn * 1000;
    if (!response.accessToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return;
    }
    this.session.set({ accessToken: response.accessToken, expiresAt });
    this.scheduleExpiration();
  }

  /** Always checks the deadline, including when browser timers have been delayed. */
  getAccessToken(): string | null {
    const current = this.session();
    if (current && current.expiresAt <= Date.now()) {
      this.clear();
      return null;
    }
    return current?.accessToken ?? null;
  }

  clear(): void {
    clearTimeout(this.expirationTimer);
    this.expirationTimer = undefined;
    this.session.set(null);
  }

  private scheduleExpiration(): void {
    const current = this.session();
    if (!current) return;
    const remaining = current.expiresAt - Date.now();
    if (remaining <= 0) {
      this.clear();
      return;
    }
    // Longer lifetimes must not overflow the browser's signed 32-bit timer delay.
    this.expirationTimer = setTimeout(() => this.scheduleExpiration(), Math.min(remaining, 2_147_483_647));
  }
}

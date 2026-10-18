import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginResponse } from './auth.models';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  const response: LoginResponse = { accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('starts anonymous and explicitly establishes a session', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
    service.establish(response);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe(response.accessToken);
  });
  it('clears all state and cancels expiration', () => {
    service.establish(response);
    service.clear();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('expires at the supplied lifetime in seconds', () => {
    service.establish(response);
    vi.advanceTimersByTime(899_999);
    expect(service.isAuthenticated()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
  });
  it('rejects expired tokens when browser timers are delayed', () => {
    service.establish(response);
    vi.setSystemTime(Date.now() + 900_000);
    expect(service.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
  for (const expiresIn of [0, -1, NaN, Infinity]) {
    it(`rejects lifetime ${expiresIn}`, () => {
      service.establish(response);
      service.establish({ ...response, expiresIn });
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getAccessToken()).toBeNull();
    });
  }
  it('replaces the session and its expiration timer', () => {
    service.establish({ ...response, expiresIn: 1 });
    service.establish({ ...response, accessToken: 'replacement' });
    vi.advanceTimersByTime(1000);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('replacement');
    expect(vi.getTimerCount()).toBe(1);
  });
  it('starts anonymous in a new application instance', () => {
    service.establish(response);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(SessionService);
    expect(fresh.isAuthenticated()).toBe(false);
    expect(fresh.getAccessToken()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

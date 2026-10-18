import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, NavigationStart, provideRouter, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { SessionService } from './session.service';

describe('Application route protection and logout', () => {
  let harness: RouterTestingHarness;
  let session: SessionService;
  let router: Router;
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideLocationMocks()] });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    harness = await RouterTestingHarness.create();
  });
  for (const url of ['/app', '/app/products', '/app/profile']) {
    it(`redirects unauthenticated access to ${url}`, async () => {
      await harness.navigateByUrl(url);
      expect(router.url).toBe('/auth/login');
    });
  }
  for (const url of ['/auth/login', '/auth/register']) {
    it(`keeps ${url} public`, async () => {
      await harness.navigateByUrl(url);
      expect(router.url).toBe(url);
    });
  }
  it('allows authenticated parent and child navigation and checks expiration between children', async () => {
    session.establish({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 });
    await harness.navigateByUrl('/app');
    expect(router.url).toBe('/app/products');
    await harness.navigateByUrl('/app/profile');
    expect(router.url).toBe('/app/profile');
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 900_000);
    try {
      await harness.navigateByUrl('/app/products');
      expect(router.url).toBe('/auth/login');
      expect(session.getAccessToken()).toBeNull();
    } finally { now.mockRestore(); }
  });
  it('logs out with replaceUrl and rejects Back navigation to an earlier protected page', async () => {
    session.establish({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 });
    await harness.navigateByUrl('/app/products');
    await harness.navigateByUrl('/app/profile');
    const navigate = vi.spyOn(router, 'navigate');
    const button = harness.routeNativeElement!.querySelector<HTMLButtonElement>('nav button')!;
    expect(button.textContent).toBe('cerrar sesion');
    expect(button.type).toBe('button');
    button.click();
    await harness.fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], { replaceUrl: true });
    expect(session.isAuthenticated()).toBe(false);
    expect(session.getAccessToken()).toBeNull();
    expect(router.url).toBe('/auth/login');
    const attemptedUrls: string[] = [];
    const events = router.events.subscribe(event => {
      if (event instanceof NavigationStart) attemptedUrls.push(event.url);
    });
    const backNavigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    TestBed.inject(Location).back();
    await backNavigation;
    await harness.fixture.whenStable();
    events.unsubscribe();
    expect(attemptedUrls).toContain('/app/products');
    expect(router.url).toBe('/auth/login');
    expect(harness.routeNativeElement!.querySelector('nav')).toBeNull();
  });
});

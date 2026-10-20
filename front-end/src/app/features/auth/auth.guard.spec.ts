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
  for (const url of ['/app', '/app/products', '/app/products/create', '/app/profile']) {
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
  it('preserves sidebar navigation, active links, and accessibility', async () => {
    session.establish({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 });
    await harness.navigateByUrl('/app/products');
    const sidebar = harness.routeNativeElement!.querySelector('app-sidebar')!;
    expect(sidebar.querySelector('nav')!.getAttribute('aria-label')).toBe('Main navigation');
    const logo = sidebar.querySelector('.app-sidebar__logo')!;
    expect(logo.getAttribute('aria-hidden')).toBeNull();
    const logoImage = logo.querySelector('img')!;
    expect(logoImage.getAttribute('src')).toBe('images/brand.png');
    expect(logoImage.getAttribute('alt')).toBe('Brand logo');
    const links = sidebar.querySelectorAll<HTMLAnchorElement>('a');
    expect(links[0].getAttribute('href')).toBe('/app/products');
    expect(links[1].getAttribute('href')).toBe('/app/profile');
    expect(links[0].classList.contains('app-sidebar__link--active')).toBe(true);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[1].getAttribute('aria-current')).toBeNull();
    links[1].click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/app/profile');
    expect(links[0].classList.contains('app-sidebar__link--active')).toBe(false);
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[1].classList.contains('app-sidebar__link--active')).toBe(true);
    expect(links[1].getAttribute('aria-current')).toBe('page');
  });
  it('logs out with replaceUrl and rejects Back navigation to an earlier protected page', async () => {
    session.establish({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 });
    await harness.navigateByUrl('/app/products');
    await harness.navigateByUrl('/app/profile');
    const navigate = vi.spyOn(router, 'navigate');
    const button = harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-sidebar nav button')!;
    expect(button.textContent).toBe('Cerrar sesion');
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

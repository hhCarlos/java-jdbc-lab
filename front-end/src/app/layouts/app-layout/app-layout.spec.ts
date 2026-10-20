import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { SessionService } from '../../features/auth/session.service';
import { AppLayout } from './app-layout';
import { ProductsService } from '../../features/products/products.service';
import { of } from 'rxjs';
import { NotificationService } from './services/notification.service';

@Component({ template: '' })
class EmptyPage {}

describe('AppLayout metadata', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter([...routes, {
      path: 'test', component: AppLayout, children: [
        { path: 'nested', loadChildren: async () => [
          { path: 'page', component: EmptyPage, data: { pageTitle: 'Nested page' } },
        ] },
        { path: 'blank', component: EmptyPage, data: { pageTitle: ' ' } },
        { path: 'missing', component: EmptyPage },
        { path: 'invalid', component: EmptyPage, data: { pageTitle: 123 } },
      ],
    }]), { provide: ProductsService, useValue: { listMine: () => of([]) } }, { provide: SessionService, useValue: { getAccessToken: () => 'token', clear: vi.fn() } }],
  }));

  it('renders initial lazy route metadata above wrapped content', async () => {
    const harness = await RouterTestingHarness.create('/app/products');
    const main = harness.routeNativeElement!.querySelector('main')!;
    expect(main.querySelectorAll('h1')).toHaveLength(1);
    expect(main.querySelector('h1')?.textContent).toBe('Products');
    expect(main.querySelector('p')?.textContent).toBe('View and manage your products.');
    expect(main.firstElementChild?.tagName).toBe('APP-PAGE-HEADER');
    expect(main.querySelector('.app-layout__content router-outlet')).toBeTruthy();
  });

  it('updates metadata while reusing the layout between Products and My Profile', async () => {
    const harness = await RouterTestingHarness.create('/app/products');
    const layout = harness.routeDebugElement!.componentInstance;
    await harness.navigateByUrl('/app/profile');
    expect(harness.routeDebugElement!.componentInstance).toBe(layout);
    expect(harness.routeNativeElement!.querySelectorAll('h1')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('My Profile');
    expect(harness.routeNativeElement!.querySelector('p')?.textContent).toBe('View your account information.');
    await harness.navigateByUrl('/app/products');
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Products');
  });

  it('resolves initial nested lazy routes without a subtitle', async () => {
    const harness = await RouterTestingHarness.create('/test/nested/page');
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Nested page');
    expect(harness.routeNativeElement!.querySelector('.page-header__subtitle')).toBeNull();
  });

  it.each(['blank', 'missing', 'invalid'])('hides the header for %s titles', async path => {
    const harness = await RouterTestingHarness.create('/test/nested/page');
    await harness.navigateByUrl(`/test/${path}`);
    expect(harness.routeNativeElement!.querySelector('app-page-header')).toBeNull();
  });

  it('preserves sidebar logout', async () => {
    const harness = await RouterTestingHarness.create('/app/products');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(SessionService).clear).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('mounts one notification host and preserves child notifications across navigation', async () => {
    const harness = await RouterTestingHarness.create('/app/products');
    const service = harness.routeDebugElement!.injector.get(NotificationService);
    const handle = service.publish({ status: 'loader', message: 'Still working' });
    await harness.navigateByUrl('/app/profile');
    expect(harness.routeDebugElement!.injector.get(NotificationService)).toBe(service);
    expect(harness.routeNativeElement!.querySelectorAll('app-notification')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('app-notification section')?.textContent).toContain('Still working');
    handle.hide();
    service.publish({ status: 'loader', message: 'Leaving' });
    await harness.navigateByUrl('/auth/login');
    expect(service.current()).toBeNull();
  });
});

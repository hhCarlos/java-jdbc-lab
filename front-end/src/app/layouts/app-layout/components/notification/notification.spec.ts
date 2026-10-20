import { TestBed } from '@angular/core/testing';
import { AppNotification } from './notification';
import { NotificationService } from '../../services/notification.service';

describe('Notifications', () => {
  let service: NotificationService;
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [NotificationService] });
    service = TestBed.inject(NotificationService);
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it.each(['success', 'error', 'warning'] as const)('dismisses %s after five seconds', status => {
    service.publish({ status, message: 'Message' });
    vi.advanceTimersByTime(4999);
    expect(service.current()?.message).toBe('Message');
    vi.advanceTimersByTime(1);
    expect(service.current()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('replaces messages, clears timers and ignores stale handles and timer callbacks', () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const old = service.publish({ status: 'warning', message: 'Old', duration: 100 });
    const callback = timeout.mock.calls.at(-1)![0] as () => void;
    service.publish({ status: 'success', message: 'New', duration: 1000 });
    old.hide();
    callback();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(100);
    expect(service.current()?.message).toBe('New');
    vi.advanceTimersByTime(900);
    expect(service.current()).toBeNull();
    timeout.mockRestore();
  });

  it('keeps loaders until explicitly hidden, ignoring duration', () => {
    const handle = service.publish({ status: 'loader', message: 'Working', duration: 1 });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(service.current()?.status).toBe('loader');
    handle.hide();
    handle.hide();
    expect(service.current()).toBeNull();
  });

  it('cleans up on dismissal and destruction', () => {
    service.publish({ status: 'error', message: 'Error' }).hide();
    expect(vi.getTimerCount()).toBe(0);
    service.publish({ status: 'success', message: 'Done' });
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
    expect(service.current()).toBeNull();
  });

  it('renders registered icons, headings, announcements and countdown only for timed messages', () => {
    const fixture = TestBed.createComponent(AppNotification);
    fixture.detectChanges();
    for (const status of ['success', 'warning', 'error', 'loader'] as const) {
      service.publish({ status, message: 'Message', heading: 'Heading', duration: 1234 });
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelectorAll('section')).toHaveLength(1);
      expect(element.querySelector('app-icon use')?.getAttribute('href')).toContain(status);
      expect(element.querySelector('.notification__heading')?.textContent).toBe('Heading');
      expect(element.querySelector(`[role="${status === 'error' ? 'alert' : 'status'}"]`)?.textContent).toContain('Message');
      expect(!!element.querySelector('.notification__progress')).toBe(status !== 'loader');
      expect(element.querySelector('section')?.style.getPropertyValue('--notification-duration')).toBe('1234ms');
    }
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(service.current()).toBeNull();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });
});

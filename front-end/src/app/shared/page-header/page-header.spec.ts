import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it.each([undefined, '', ' \n\t '])('omits absent or blank subtitles (%s)', subtitle => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('title', 'Page title');
    fixture.componentRef.setInput('subtitle', subtitle);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Page title');
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('renders and removes the subtitle as inputs change', () => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('title', 'Page title');
    fixture.componentRef.setInput('subtitle', 'Details');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toBe('Details');
    fixture.componentRef.setInput('subtitle', ' ');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });
});

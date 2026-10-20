import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router, RouterOutlet } from '@angular/router';
import { PageHeader } from '../../shared/page-header/page-header';
import { AppSidebar } from '../app-sidebar/app-sidebar';
import { SessionService } from '../../features/auth/session.service';
import { AppNotification } from './components/notification/notification';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [AppSidebar, PageHeader, RouterOutlet, AppNotification],
  providers: [NotificationService],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);
  protected readonly page = signal<{ title: string; subtitle?: string } | null>(null);

  constructor() {
    this.updatePage();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.updatePage());
  }

  private updatePage(): void {
    let active = this.route.snapshot;
    let child = active.children.find(route => route.outlet === PRIMARY_OUTLET);
    if (!child) {
      this.page.set(null);
      return;
    }
    while (child) {
      active = child;
      child = active.children.find(route => route.outlet === PRIMARY_OUTLET);
    }
    const { pageTitle, pageSubtitle } = active.data;
    this.page.set(typeof pageTitle === 'string' && pageTitle.trim()
      ? { title: pageTitle, subtitle: typeof pageSubtitle === 'string' ? pageSubtitle : undefined }
      : null);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}

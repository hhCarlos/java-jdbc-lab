import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AppSidebar } from '../app-sidebar/app-sidebar';
import { SessionService } from '../../features/auth/session.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [AppSidebar, RouterOutlet],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}

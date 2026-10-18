import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../features/auth/session.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
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

import { Component, inject } from '@angular/core';
import { AppIcon } from '../../../../shared/app-icon/app-icon';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  imports: [AppIcon],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class AppNotification {
  protected readonly notifications = inject(NotificationService);
}

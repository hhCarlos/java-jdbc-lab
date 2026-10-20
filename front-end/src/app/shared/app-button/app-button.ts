import { booleanAttribute, Component, input, output } from '@angular/core';
import { AppIcon, IconName } from '../app-icon/app-icon';

export type ButtonIconPosition = 'left' | 'right' | 'top' | 'bottom';
export type ButtonStatus = 'default' | 'success' | 'error' | 'warning';
export type ButtonVariant = 'solid' | 'ghost';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './app-button.html',
  styleUrl: './app-button.scss',
})
export class AppButton {
  readonly label = input.required<string>();
  readonly icon = input<IconName>();
  readonly iconPosition = input<ButtonIconPosition>('left');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly type = input<ButtonType>('button');
  readonly status = input<ButtonStatus>('default');
  readonly variant = input<ButtonVariant>('solid');
  readonly pressed = output<MouseEvent>();

  protected activate(event: MouseEvent): void {
    if (!this.disabled()) this.pressed.emit(event);
  }
}

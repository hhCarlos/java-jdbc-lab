import { Component, computed, input } from '@angular/core';

export type IconName = 'placeholder';
export type IconSize = 'sm' | 'md' | 'xl' | 'xll';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './app-icon.html',
  styleUrl: './app-icon.scss',
  host: { '[attr.data-size]': 'size()' },
})
export class AppIcon {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
  readonly label = input<string>();
  readonly accessibleLabel = computed(() => this.label()?.trim() || null);
}

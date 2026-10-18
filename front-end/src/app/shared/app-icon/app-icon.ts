import { Component, computed, input } from '@angular/core';

import { resolveIconSymbol } from './icon-registry';

export type { IconName } from './icon-registry';
export type IconSize = 'sm' | 'md' | 'xl' | 'xll';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './app-icon.html',
  styleUrl: './app-icon.scss',
  host: { '[attr.data-size]': 'size()' },
})
export class AppIcon {
  /** Expected icon name; omitted or unsupported values render the fallback. */
  readonly name = input<string | null>();
  readonly symbolId = computed(() => resolveIconSymbol(this.name()));
  readonly size = input<IconSize>('md');
  readonly label = input<string>();
  readonly accessibleLabel = computed(() => this.label()?.trim() || null);
}

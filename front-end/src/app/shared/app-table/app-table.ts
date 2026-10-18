import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, TemplateRef } from '@angular/core';

export interface TableRowContext<T> {
  $implicit: T;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  cellTemplate?: TemplateRef<TableRowContext<T>>;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './app-table.html',
  styleUrl: './app-table.scss',
})
export class AppTable<T extends object> {
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly TableColumn<T>[]>();
  /** Values of this field must be unique and stable within the collection. */
  readonly rowKey = input.required<keyof T>();
  readonly actionsTemplate = input<TemplateRef<TableRowContext<T>>>();
  readonly emptyMessage = input('No records to display.');
  readonly visibleColumnCount = computed(() =>
    Math.max(1, this.columns().length + (this.actionsTemplate() ? 1 : 0)));
}

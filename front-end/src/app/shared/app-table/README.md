# AppTable

Standalone presentational table. Import `AppTable` into the consuming component.
No page or backend integration is required.

| Input | Type | Default |
| --- | --- | --- |
| `rows` | `readonly T[]` | Required |
| `columns` | `readonly TableColumn<T>[]` | Required |
| `rowKey` | `keyof T` | Required |
| `actionsTemplate` | `TemplateRef<TableRowContext<T>>` | Omitted |
| `emptyMessage` | `string` | `No records to display.` |

`T` is the row object type. Each column has `key: keyof T`, `header: string`,
and optional `cellTemplate: TemplateRef<TableRowContext<T>>`. Both cell and
actions templates receive `{ $implicit: row }`, accessed with `let-row`.
Keys must be fields of the row type; use unique column keys and unique, stable
values for `rowKey`. Readonly arrays are supported.

Default cells interpolate text, preserving `0`, `false`, and empty strings.
Only `null` and `undefined` display `—`. The Actions header and cells appear
only when an actions template is provided. The empty message spans all visible
columns. The wrapper scrolls horizontally when columns exceed available width.
Headers use `scope="col"`; give consumer action buttons meaningful names.

## Example

Formatting, currency choice, and action behavior belong to the consuming component:

```ts
import { CurrencyPipe } from '@angular/common';
import { Component, computed, TemplateRef, viewChild } from '@angular/core';
import { AppTable, TableColumn, TableRowContext } from './app-table'; // Adjust path.

interface ItemRow {
  id: number;
  title: string;
  price: number;
  stock: number;
}

@Component({
  selector: 'app-table-example',
  standalone: true,
  imports: [AppTable, CurrencyPipe],
  template: `
    <ng-template #price let-row>
      {{ row.price | currency:currencyCode }}
    </ng-template>
    <ng-template #actions let-row>
      <button type="button" (click)="open(row)">Open {{ row.title }}</button>
    </ng-template>
    <app-table
      [rows]="rows"
      [columns]="columns()"
      rowKey="id"
      [actionsTemplate]="actions"
      emptyMessage="No items available."
    />
  `,
})
export class TableExample {
  readonly currencyCode = 'MXN';
  readonly rows: readonly ItemRow[] = [
    { id: 1, title: 'Notebook', price: 45, stock: 0 },
  ];
  readonly priceTemplate = viewChild<TemplateRef<TableRowContext<ItemRow>>>('price');
  readonly columns = computed<readonly TableColumn<ItemRow>[]>(() => [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Title' },
    { key: 'price', header: 'Price', cellTemplate: this.priceTemplate() },
    { key: 'stock', header: 'Stock' },
  ]);

  open(row: ItemRow): void {
    // Consumer decides how to handle this row.
    console.log(row.id);
  }
}
```

There are no table outputs or built-in action handlers. The table provides no
HTTP calls, pagination, sorting, filtering, selection, or editing behavior.

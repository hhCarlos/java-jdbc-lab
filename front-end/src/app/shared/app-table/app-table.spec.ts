import { CurrencyPipe } from '@angular/common';
import { Component, computed, TemplateRef, viewChild, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppTable, TableColumn, TableRowContext } from './app-table';

interface TestRow {
  id: number;
  title: string;
  price: number | null;
  stock: number | undefined;
  active: boolean;
}

@Component({
  imports: [AppTable, CurrencyPipe],
  template: `
    <ng-template #price let-row>{{ row.price | currency:currencyCode }}</ng-template>
    <ng-template #actions let-row>
      <button type="button" (click)="selected = row">Open {{ row.title }}</button>
    </ng-template>
    <app-table [rows]="rows()" [columns]="columns()" rowKey="id"
      [actionsTemplate]="showActions() ? actions : undefined" [emptyMessage]="emptyMessage" />
  `,
})
class TestHost {
  readonly rows = signal<TestRow[]>([
    { id: 2, title: '<Second>', price: 12.5, stock: 0, active: false },
    { id: 1, title: 'First', price: null, stock: undefined, active: true },
  ]);
  readonly showActions = signal(false);
  readonly customPrice = signal(false);
  emptyMessage = 'Nothing here.';
  currencyCode = 'EUR';
  selected?: TestRow;
  readonly priceTemplate = viewChild<TemplateRef<TableRowContext<TestRow>>>('price');
  readonly columns = computed<readonly TableColumn<TestRow>[]>(() => [
    { key: 'title', header: 'Title' },
    { key: 'id', header: 'ID' },
    { key: 'stock', header: 'Stock' },
    { key: 'active', header: 'Active' },
    { key: 'price', header: 'Price', cellTemplate: this.customPrice() ? this.priceTemplate() : undefined },
  ]);
}

function setup() {
  const fixture = TestBed.createComponent(TestHost);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  return { fixture, host: fixture.componentInstance, element };
}

function cellText(row: Element): string[] {
  return Array.from(row.querySelectorAll('td'), cell => cell.textContent?.trim() ?? '');
}

describe('AppTable', () => {
  it('maps headers and property values in column order, escaping default text', () => {
    const { element } = setup();
    expect(Array.from(element.querySelectorAll('th'), th => th.textContent?.trim()))
      .toEqual(['Title', 'ID', 'Stock', 'Active', 'Price']);
    expect(Array.from(element.querySelectorAll('th'), th => th.getAttribute('scope')))
      .toEqual(['col', 'col', 'col', 'col', 'col']);
    expect(cellText(element.querySelector('tbody tr')!))
      .toEqual(['<Second>', '2', '0', 'false', '12.5']);
    expect(element.querySelector('tbody td')!.children).toHaveLength(0);
    expect(element.querySelector('tbody button')).toBeNull();
  });

  it('preserves zero and false while replacing only nullish values', () => {
    const { element } = setup();
    const rows = element.querySelectorAll('tbody tr');
    expect(cellText(rows[0]).slice(2, 4)).toEqual(['0', 'false']);
    expect(cellText(rows[1])).toEqual(['First', '1', '—', 'true', '—']);
  });

  it('shows a configurable empty message spanning visible columns including actions', () => {
    const { fixture, host, element } = setup();
    host.rows.set([]);
    fixture.detectChanges();
    const empty = element.querySelector('tbody td')!;
    expect(empty.textContent?.trim()).toBe('Nothing here.');
    expect(empty.getAttribute('colspan')).toBe('5');
    host.showActions.set(true);
    fixture.detectChanges();
    expect(empty.getAttribute('colspan')).toBe('6');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('renders a custom cell with the current row and consumer currency', () => {
    const { fixture, host, element } = setup();
    host.customPrice.set(true);
    fixture.detectChanges();
    expect(cellText(element.querySelector('tbody tr')!).at(-1)).toBe('€12.50');
  });

  it('adds actions only when provided and passes the correct row to the handler', () => {
    const { fixture, host, element } = setup();
    host.showActions.set(true);
    fixture.detectChanges();
    expect(element.querySelector('thead th:last-child')?.textContent?.trim()).toBe('Actions');
    const buttons = element.querySelectorAll<HTMLButtonElement>('tbody button');
    expect(buttons[1].textContent?.trim()).toBe('Open First');
    buttons[1].click();
    expect(host.selected).toBe(host.rows()[1]);
    host.showActions.set(false);
    fixture.detectChanges();
    expect(element.querySelectorAll('th')).toHaveLength(5);
    expect(element.querySelector('tbody button')).toBeNull();
  });

  it('tracks rows by their configured key when reordered', () => {
    const { fixture, host, element } = setup();
    const originalFirst = element.querySelector('tbody tr');
    host.rows.update(rows => [...rows].reverse());
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')[1]).toBe(originalFirst);
  });
});

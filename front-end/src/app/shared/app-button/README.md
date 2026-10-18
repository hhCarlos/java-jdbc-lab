# AppButton

Import `AppButton` from `./app-button` (adjust the path) and add it to the consuming
standalone component's `imports` array.

| API | Type | Default |
| --- | --- | --- |
| `label` | `string` | Required |
| `icon` | `IconName` from the existing icon registry | Omitted |
| `iconPosition` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` |
| `disabled` | `boolean` | `false` |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` |
| `pressed` | Output emitting the original `MouseEvent` | — |

```html
<app-button label="Save" icon="products" (pressed)="save()" />
<app-button label="Continue" icon="profile" iconPosition="right" />
<app-button label="Profile" icon="profile" iconPosition="top" />
<app-button label="Log out" icon="logout" iconPosition="bottom" (pressed)="logout()" />
<app-button label="Save" [disabled]="saving()" (pressed)="save()" />

<form (ngSubmit)="createAccount()">
  <!-- Consumer's form fields go here. Import FormsModule or ReactiveFormsModule. -->
  <app-button label="Create account" type="submit" />
</form>
```

The consumer owns handlers. `pressed` follows native click activation, including
keyboard activation; it is not a toggle state. Disabled buttons emit nothing.
Submit and reset use normal browser form behavior, and the component never
prevents the activation event's default action. For form submission, handle the
form's submit event to avoid invoking the same action in both handlers.

The visible label supplies the accessible name. Icons remain decorative and
inherit the button text color. Omitting `icon` renders text only, with no fallback
icon. Horizontal positions put the icon before or after the label; top and bottom
use a vertical layout with matching DOM order.

Brand, foreground, hover, active, focus, and disabled colors use existing semantic
tokens for light and dark themes. Spacing, radius, and typography also use the
shared tokens. Long labels wrap within the available width.

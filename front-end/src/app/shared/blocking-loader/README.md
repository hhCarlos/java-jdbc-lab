# Blocking loader

The standalone `BlockingLoader` is mounted once beside the routed content in
`app.html`. It starts hidden. No HTTP or authentication integration is included.

Inject `BlockingLoaderService` and call `show()` to acquire visibility. The
returned function hides the loader when all callers have released their claims;
it is safe to call more than once. Always release in `finally` (or RxJS
`finalize`) so errors cannot leave the application blocked:

```ts
private readonly loader = inject(BlockingLoaderService);
private readonly destroyRef = inject(DestroyRef);

async performWork(): Promise<void> {
  const hide = this.loader.show();
  const unregister = this.destroyRef.onDestroy(hide);
  try {
    await this.performOperation();
  } finally {
    hide();
    unregister();
  }
}
```

For component-owned work that may outlive its view, also register the returned
function with `DestroyRef.onDestroy(hide)` and unregister that callback when the
work completes. This prevents a destroyed caller from leaving a visibility claim.
The readonly `visible()` signal is available for observation; callers cannot set it.

The root content becomes inert and `aria-busy` while active. Focus moves to the
labelled modal status overlay; Tab and other page key events are blocked. A
persistent live region announces “Please wait…”. Native inert behavior excludes
underlying controls from pointer interaction, keyboard focus, and the accessibility
tree. The themed fixed overlay catches pointer and touch input. Both document
scroll roots have overflow locked, with exact prior inline values and priorities
restored on hide or destruction. Focus returns to the previous connected,
non-inert element if focus is still owned by the overlay. Reduced motion disables
spinner rotation. Application layer conventions are in `styles/README.md`.

Browser verification without adding UI: use an Angular development build and the
browser console:

```js
const overlay = ng.getComponent(document.querySelector('app-blocking-loader'));
const hideLoader = overlay.loader.show();
// Inspect visibility, try Tab/Shift+Tab, click underlying content, and scroll.
// Switch document.documentElement.dataset.theme between 'light' and 'dark'.
hideLoader();
```

The console access uses Angular's development debugging API and is not a public
component API. Verify focus restoration from a previously focused control, and
scrolling from an already scrolled page. Test reduced motion with browser media
emulation. Screen-reader announcement behavior requires assistive-technology testing.

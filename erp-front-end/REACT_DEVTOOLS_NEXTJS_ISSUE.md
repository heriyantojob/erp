# React DevTools / Next.js development overlay warning

## Symptom

The Next.js development overlay may show:

`The children should not have changed if we pass in the same set.`

When the call stack only contains URLs beginning with:

`chrome-extension://fmkadmapgofadopljbjfkapdkoienihi/build/installHook.js`

then the error originates from the React DevTools Chrome extension instrumentation,
not from an ERP application source file.

## Project-side mitigation included

- SupplierSelect no longer portals its menu into `document.body`.
- Async React Select callbacks are memoized with `useCallback`.
- Selected supplier resolution avoids unnecessary repeated state updates.
- `npm run dev:clean` clears `.next` before starting Turbopack.
- `npm run dev:webpack` is available as a development fallback.

## Recommended local checks

1. Stop Next.js.
2. Run `npm run dev:clean`.
3. Hard refresh the browser.
4. If the warning still shows and every stack frame is `chrome-extension://.../installHook.js`, disable or update the React Developer Tools extension and reload.
5. You can also test in an Incognito window with extensions disabled.
6. If you need a bundler comparison, run `npm run dev:webpack`.

Do not disable application validation or React Strict Mode merely to hide an
extension instrumentation warning.

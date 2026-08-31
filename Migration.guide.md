# Migration Guides

Upgrade notes for non-trivial `walk-async` releases. For the full per-release list of changes, see the [Changelog](Changelog.md); this guide focuses on what *you* have to change in your code.

Most common first, then version history newest-first.



## From `@peter.naydenov/walk` (sync sibling)

`walk-async` is the async sibling of [`@peter.naydenov/walk`](https://github.com/PeterNaydenov/walk). They share the same callback parameter names (`value`, `key`, `breadcrumbs`) and the same three-outcome contract. The only mechanical change is how you express the return value:

| `walk` (sync)                    | `walk-async` (async)         |
| -------------------------------- | ---------------------------- |
| `return value`                   | `resolve(value)`             |
| `return newObject`               | `resolve(newObject)`         |
| `return IGNORE`                  | `reject()`                   |

The options shape is identical: `{ data, keyCallback, objectCallback }`. `walk-async` adds an optional `timeout` (milliseconds). The walk call itself becomes an `await` (or `.then`).

```js
// walk
const result = walk ({
    data: user,
    keyCallback: ({ value, key, IGNORE }) => key === 'password' ? IGNORE : value
})

// walk-async — same shape, just promise-based
const result = await walk ({
    data: user,
    keyCallback: ({ value, key, resolve, reject }) => {
        if ( key === 'password' )   reject ()
        else                       resolve ( value )
    }
})
```

If your callbacks don't actually need async work, prefer the sync `walk` — it's noticeably faster because it avoids the promise machinery. Reach for `walk-async` only when you have real async work inside the callbacks (database lookups, network calls, file reads, etc.) and the cost of multiple `walk` calls would be unacceptable.



## From v.3.x.x - v.6.x.x

v6 is a version-alignment release with `@peter.naydenov/walk` (the sync sibling). **Behaviour is unchanged from v.3.1.3** — every v3.x callback that worked in v3.1.3 still works identically in v6.x. The only user-facing change is on the TypeScript side.

### Callback signatures are now strictly typed

`keyCallback` and `objectCallback` are now typed as `KeyCallback` / `ObjectCallback` over a `CallbackArgs` shape, and `resolve` / `reject` are exported as `Resolve` / `Reject` typedefs so TypeScript users get autocomplete. If your callbacks already called `resolve(value)` / `reject()` correctly, they keep working unchanged at runtime; TypeScript will now catch signature mistakes at compile time.

```ts
// v3.x.x  - call signatures inferred from usage; no Resolve/Reject typedefs
function keyCallback ({ value, key, resolve, reject }) {
    if (key === 'password') reject()
    else resolve(value)
}

// v6.x.x  - same code, now type-checked against the exported Resolve / Reject
import type { KeyCallback, Resolve, Reject } from '@peter.naydenov/walk-async'
const keyCallback: KeyCallback = ({ value, key, resolve, reject }) => {
    if (key === 'password') reject()
    else (resolve as Resolve)(value)
}
```

If you're on JavaScript (not TypeScript), there is nothing to change.



## From v.3.0.x - v.3.1.x

A new optional `timeout` (milliseconds) was added. When set, the walk promise is rejected if any callback has not called `resolve` or `reject` in time; the error message lists the breadcrumbs of every still-pending callback so the broken code path can be found directly.

```js
// v3.0.x
const result = await walk ({ data, keyCallback })   // hangs forever if a callback forgets to resolve

// v3.1.x
const result = await walk ({ data, keyCallback, timeout: 5000 })
// if a callback never settles, the walk promise is rejected with:
//   walk-async: timed out after 5000ms; callbacks still pending:
//     - keyCallback at 'root/props/age'
```

This is purely additive — the option is optional, off by default, and identical to v3.0.x when omitted. The pre-existing v3.0.6 and v3.0.7 bug fixes (`__proto__` no longer replacing the copy's prototype; top-level property named `root` no longer dropped; `objectCallback` resolving the root with a primitive no longer crashes) shipped in this window. Correct code gets more lenient, not more strict.

This is also the window when `Date`, `RegExp`, `Map`, `Set`, `WeakMap`, `WeakSet`, `ArrayBuffer`, `DataView`, and typed arrays became passed by reference (v.3.1.2). They used to come out as empty `{}` — that was almost always a bug, so the fix is a no-op for working code, but if you were somehow relying on the broken behaviour, this is the release that changed it.



## From v.2.x.x - v.3.x.x

Difference between v.2.x.x and v.3.x.x is that object callbacks are triggered on 'root' object as well. So if you have object callbacks that are not working as expected after upgrade, you need to add extra line of code for version 3.

```js
// version 2
function oCallbackFn ({ value:o, key, IGNORE }) {
                          // Some code
                      }

// version 3
function oCallbackFn ({ value:o, key, IGNORE, breadcrumbs }) {
                          if ( breadcrumbs === 'root' ) return o   // Extra line of code for version 3
                          // Some code
                      }
```

Everything else works the same.



## From v.1.x.x - v.2.x.x

v2 converted the package to a proper ES module and added a built `dist/` (CommonJS, ESM, UMD) plus a `package.json` `exports` map and a Rollup build pipeline.

**For most users the upgrade is automatic** — your bundler / runtime picks the right build from the `exports` map. The only breaking case is if you were reaching into the package by path:

```js
// v1.x.x - CommonJS; the package exports a function
const walk = require ( '@peter.naydenov/walk-async' )

// v2.x.x - ES module; the default export is the walk function
import walk from '@peter.naydenov/walk-async'
```

If you were loading source directly (`require('@peter.naydenov/walk-async/src/main')` or similar), use the package's `exports` map (`@peter.naydenov/walk-async/src/main`) instead, or just import the default.



## From v.1.0.0 - v.1.x.x

v1.x added a series of small but important fixes. If you are still on v.1.0.0, the relevant ones are:

### v.1.1.0 - `null` and `undefined` resolution

Returning `null` or `undefined` from a callback is now stored as the literal value (not treated as "skip"). If you were relying on `null` to mean "drop this key", switch to `reject()` (in v6.x) or to whatever the v1.x equivalent was — the API has since changed.

### v.1.2.0 - DOM nodes copied by reference

`walk-async` no longer descends into HTML DOM nodes — they are passed through by reference. This is the same contract as functions, and (added later in v.3.1.2) `Date` / `Map` / `Set` / `RegExp` / typed arrays.

### v.1.3.0 - `undefined`-valued keys preserved; collection containers

Keys whose value is `undefined` are now copied (they were being dropped in v.1.0.0). Also, callbacks can now extract data into provided collection containers during iteration.

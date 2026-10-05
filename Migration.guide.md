# Migration Guides

Upgrade notes for non-trivial `walk-async` releases. For the full per-release list of changes, see the [Changelog](Changelog.md).

## From v.6.x.x - v.7.x.x (Unreleased)

### Agent skill

The skill is now named `walk-async` and lives in `skills/walk-async/`, replacing
`.agents/skills/git-walk-async/`. Update installers or integrations that use
the old path, and include the full folder with all four linked references.
There is one canonical portable skill; local `.claude` and `.agents` settings
are not maintained copies. See [skill integration](skills/README.md).

The current `package.json` `files` whitelist excludes the new folder. Replace
the obsolete `".agents/skills"` entry with `"skills"` to include the skill, all
references, and the integration README linked from the package documentation. This manifest update is left for
the maintainer; the skill/documentation move does not change package.json.
Verify the folder with `npm pack --dry-run --json` after making that change.

### Return values and awaited callbacks

Callbacks now share the synchronous library's return-value API. Change `resolve(value)` to `return value`, and `reject()` to `return IGNORE()` when adopting it:

```js
// version 6: still supported in version 7
keyCallback : ({ value, key, resolve, reject }) => {
                  if ( key === 'password' )   reject ()
                  else                       resolve ( value )
              }

// version 7
keyCallback : async ({ value, key, IGNORE }) => {
                  if ( key === 'password' )   return IGNORE()
                  return await refresh ( value )
              }
```

Both plain returns and returned promises are supported. The walk itself still returns a Promise. Await it to get the copy, finish side effects, or catch an error. A thrown error or a rejected promise from either callback now rejects the walk instead of leaving internal tasks pending. Finite awaited nested walks are supported; each call has independent traversal and ancestor state.

Existing `resolve`/`reject` callbacks remain supported. Reading either field selects explicit settlement for that invocation, so settle every path with one of them. An async callback's returned promise is awaited even when it calls `resolve` early; `resolve` also awaits a supplied promise. Do not destructure or spread unused settlement fields when switching to returns. `reject()` continues to prune the current key or branch; use a throw or a rejected promise to fail the walk. The existing `timeout` option still reports pending callbacks and now covers unresolved returned promises too. It does not cancel callback I/O.

### Callable IGNORE

`IGNORE` is a function in both callbacks. When moving code from the synchronous v6 API, replace `return IGNORE` with `return IGNORE()`:

```js
// synchronous version 6
keyCallback : ({ value, key, IGNORE }) => key === 'password' ? IGNORE : value

// version 7, synchronous or asynchronous
keyCallback : ({ value, key, IGNORE }) => key === 'password' ? IGNORE() : value
```

Its private token removes a leaf or an entire container branch, including descendants. Ignoring the root resolves `[]` for an original array root or `{}` for an original object root when copying; without copying it resolves `undefined`. Returning the helper function itself stores ordinary function data. Async v6 used `reject()` rather than a public IGNORE constant; those callbacks do not need this change. TypeScript now includes `IgnoreFunction`, `PassFunction`, `ObjectCallbackArgs`, and `Settings` alongside `Resolve` and `Reject`. Metadata fields are optional and parent paths are read-only.

### Callback order

Sibling callbacks used to start concurrently. Version 7 awaits them one at a time in `Object.keys` order to match the synchronous library. The root object callback runs first; child object callbacks run when their properties are encountered, and those containers' contents are deferred until the current container finishes. Queued containers run in scheduling order, breadth-first over contents. There is no exit callback.

Code that depends on sibling callbacks overlapping must move that concurrency into application code. Array output, side effects, replacement handling, and ancestor lookup now follow the same defined order even when callbacks await different delays.

### Getter and array fixes

Properties are read once before classification. Getters no longer run twice. `Array.isArray` recognizes arrays from other JavaScript contexts. Only canonical indexes from `0` through `2^32 - 2` become consecutive output elements. Sparse holes and removed indexes compact; numeric-looking non-index properties such as `'01'`, `'-1'`, and `'4294967295'` retain their original names. Own `'__proto__'` properties remain ordinary data without changing the result prototype.

### Settings, parentPath and PASS

Existing calls do not need a `settings` object. Both callbacks now receive a read-only `parentPath` array by default, alongside `breadcrumbs`. The parent path excludes `key`; the root `objectCallback` receives `parentPath:[]` and `key:'root'`.

Set `settings.breadcrumbs` or `settings.parentPath` to literal `false` to skip preparing an unused argument. Omitted settings remain enabled. Disabled arguments are absent, so destructuring them gives `undefined`; TypeScript declares both metadata fields as optional.

```js
let result = await walk ({
                          data
                        , settings : { breadcrumbs:false, parentPath:false }
                        , keyCallback : ({ value }) => value
                    })
```

Default calls now prepare parent arrays when callbacks are present. Disable `parentPath` when the callback does not use it, particularly for deeply nested data. With no callbacks, both paths are skipped automatically.

`objectCallback` also receives the `PASS` function. Return `PASS()` to copy the current value and skip `keyCallback` only on its immediate properties, or `PASS(modifiedValue)` to use a replacement with the same rule. Nested objects and arrays still run their own callbacks normally. `IGNORE()` removes the entire branch and stops visiting its contents.

`PASS()` and `PASS(undefined)` have different meanings: the first keeps the current value; the second explicitly replaces it with `undefined`. A simple replacement is stored directly without `keyCallback`. Neither instruction appears in the result.

Walk Async also awaits promises supplied to `PASS(replacement)` before interpreting the replacement and checking its ancestors. Rejected replacements reject the walk; unresolved replacements remain in timeout diagnostics.

### Finish the entire walk

Both callbacks now receive the `FINISH` function. Like `IGNORE()` and `PASS()`, return its instruction or pass it to `resolve`. Calling it without returning or resolving the instruction has no effect on traversal.

```js
let result = await walk ({
                          data : [12,22,33,44,55,66]
                        , keyCallback : ({ value, FINISH }) => {
                                              if ( value === 33 )   return FINISH ( value )
                                              return value
                                          }
                    })
// [12,22,33]
```

`FINISH()` omits the current value or branch and stops immediately. From `keyCallback`, `FINISH(value)` includes the supplied value directly and stops immediately, without copying or visiting its contents. An explicit argument counts even when it is `undefined`.

From `objectCallback`, `FINISH(value)` selects the final branch. If a key callback exists, it processes the supplied value's leaves with the new boolean argument `isFinished:true`, including nested containers and containers returned by key callbacks. No further object callbacks run, and unrelated pending work is discarded. Ordinary key callbacks receive `isFinished:false`. Return `value` to preserve final leaves, `IGNORE()` to drop them while continuing through the final branch, or `FINISH()` / `FINISH(value)` to stop immediately at a final leaf. Dropping leaves can leave empty nested containers. Earlier `PASS()` instructions do not suppress key callbacks in the selected final branch.

Without a key callback, `FINISH(value)` from an object callback includes the value directly. Supplied objects and arrays then keep their references. With a key callback, the final branch is copied using the normal leaf return rules and cycle detection. A simple root replacement remains a direct return without a key callback, matching the existing root contract.

When copying, the result contains work completed before stopping. Unrelated containers already allocated but waiting for traversal can remain empty or partially populated. Finishing from the root object callback without a value resolves an empty object or array matching the input root; supplying a container follows the final-branch rule. Without copying, finishing still controls traversal and walk resolves `undefined`. Collect search results externally in that mode.

Walk Async awaits callback completion and promises supplied to `FINISH(value)`, including through `resolve ( FINISH ( value ) )`. Rejected payloads reject the walk; unresolved payloads remain in timeout diagnostics.

This is an optional addition; existing callbacks do not need changes. Finishing is local to each walk, including nested calls. TypeScript declares the shared helper as `FinishFunction` and the key callback arguments as `KeyCallbackArgs`, including `isFinished:boolean`.

### Walk without a copy

Set `settings.copy` to literal `false` to run callbacks without creating result objects or arrays. Walk resolves `undefined` in this mode, including for simple, ignored, or replaced roots. Copying remains enabled when the setting is omitted or has any other value.

```js
let values = [];
await walk ({
          data : { number:1, nested:{ number:2 } }
        , settings : { copy:false }
        , keyCallback : ({ value }) => { values.push ( value ) }
    })
// values: [1,2]
```

Callback order and path arguments stay the same. `IGNORE()` still prunes branches; `PASS()` and `PASS(value)` still skip immediate key callbacks while visiting nested objects normally. Returned replacement containers are visited without being assigned to the source.

An object callback must still return the current or replacement value to continue into it. A key callback used only for side effects may omit its return. Metadata settings are independent of copying; disable unused paths separately.

### Circular references

Walk now detects references back to an ancestor instead of following them indefinitely. When copying, the reference points to that ancestor's copy: if `data.self === data`, then `result.self === result`. With `settings.copy:false`, traversal stops at that edge and resolves `undefined` as usual.

Object callbacks still receive circular properties and can ignore or replace them. The returned container is checked against the current branch's ancestors before visiting its contents. This also applies to containers returned by `keyCallback`. Repeated references on separate branches are still copied independently. No new setting or callback argument is required; detection works with both path settings disabled.

Detection defaults to true. Set `settings.detectCycles` to literal `false` to skip the checks and all ancestor bookkeeping when the visited data and callback replacements are known to be acyclic. Omitted settings and other values keep detection enabled. Copying and metadata settings remain independent.

```js
let result = await walk ({
                          data : JSON.parse ( '{"nested":{"number":1}}' )
                        , settings : { detectCycles:false }
                    })
// { nested:{ number:1 } }
```

With detection disabled, callbacks must prune cyclic branches before revisiting them; otherwise traversal can continue indefinitely. Callback order and return rules are unchanged.

### Traversal performance

Nested containers now use a work queue instead of generator wrappers. Processed entries are cleared to release their container and path references earlier. Callback order and return behaviour stay the same; no changes to your callbacks are required for this optimization. Walk no longer uses generator functions, so a generator polyfill is no longer needed for the library itself.

Pending descendants keep links to their ancestor containers for circular-reference detection. Shallow branches use the short parent chain; deeper branches use an internal lookup containing only the current branch's ancestors. This avoids repeatedly scanning long chains. Detection adds bookkeeping even when path preparation is disabled.


### Package declarations

The generated declarations describe the new settings, helpers, optional metadata, and Promise return contract. The package now includes a `types` condition before the runtime conditions in `package.json` for modern TypeScript resolution:

```json
"exports": {
  ".": {
    "types": "./types/main.d.ts",
    "import": "./dist/walk-async.esm.mjs",
    "require": "./dist/walk-async.cjs",
    "default": "./dist/walk-async.umd.js"
  },
  "./package.json": "./package.json",
  "./dist/*": "./dist/*",
  "./src/*": "./src/*"
}
```

Strict package-name imports now resolve declarations under `NodeNext` and `Bundler`. The package exports were verified with strict ESM, CommonJS default-import, and bundler consumers.



## From `@peter.naydenov/walk` (sync sibling)

For version 7 of both packages, keep the callbacks and settings, change the import, and await the walk:

```js
import walk from '@peter.naydenov/walk-async'

let result = await walk ({
                          data : { name:'Peter', password:'secret' }
                        , keyCallback : ({ value, key, IGNORE }) => key === 'password' ? IGNORE() : value
                    })
```

Async callbacks may await I/O and return their result. Both packages share paths, replacement rules, local `PASS`, callable `IGNORE`, no-copy traversal, and ancestor-cycle handling. Walk Async additionally retains explicit `resolve`/`reject` callbacks and `timeout` diagnostics. It awaits callback results; the synchronous library does not. For pre-v7 synchronous code, change `return IGNORE` to `return IGNORE()` too.

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

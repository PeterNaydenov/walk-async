---
name: git-walk-async
description: |
  Help developers use `@peter.naydenov/walk-async` (the async `walk` from
  the git-walk-async project, v6.1.0): write a deep copy with `await
  walk({ data, keyCallback?, objectCallback?, timeout? })`, use the
  `resolve` / `reject` pair inside callbacks to store or drop values, and
  leverage the `timeout` option as a debugging safety net. Use when the
  developer asks for a deep copy with simultaneous async transforms, a
  deep `forEach` that can `await` work and drop or rewrite values, a
  single-pass async clone that filters keys by name, or anything phrased
  as "async deep copy / async deep clone / async deep walk / async deep
  forEach" where the transforms do real async I/O. Do NOT use for: sync
  walks (point to the sibling `@peter.naydenov/walk` instead),
  deep-copying a `Map` / `Set` / `Date` / typed array (use
  `structuredClone` for those), retry / abort semantics, or fixing bugs
  in the library itself.
---

# git-walk-async helper

A single-pass deep walk over a JavaScript data structure that runs two
optional async callbacks during the visit. Each callback can `await`
work and reports back via `resolve(value)` or `reject()`. A plain deep
copy is the no-callback case.

This is the **async sibling** of `@peter.naydenov/walk`. If your
callbacks don't actually need `await`, prefer the sync version — it's
noticeably faster because it avoids the promise machinery.

Source of truth:
- `src/main.js` — JSDoc on every public function and typedef (`walk`, `keyCallback`, `objectCallback`, `CallbackArgs`, `Resolve`, `Reject`, `Options`)
- `test/01-deepCopy.test.js` — plain deep copy
- `test/02-keyCallback.test.js` — primitive transforms
- `test/03-objectCallback.test.js` — object/array transforms
- `test/04-async.test.js` — real async work in callbacks
- `test/05-bothCallbacks.test.js` — interaction between the two
- `test/06-builtins.test.js` — Date / Map / Set / typed arrays / DOM nodes
- `README.md` — narrative docs (lead paragraph, "When to use `walk-async` vs `structuredClone`" callout, "Migrating from `@peter.naydenov/walk`" table, "Timeout" section, "Limitations")

## Procedure

1. **Map the developer's intent to the right shape of `await walk({ data, ... })` call**:
   - "Just deep-copy this" / "give me an immutable copy" → `await walk({ data })` (no callbacks)
   - "Drop a few keys while copying" → `await walk({ data, keyCallback })`; call `reject()` for the keys to drop
   - "Mask a value" / "rewrite a value" → `await walk({ data, keyCallback })`; call `resolve(newValue)`
   - "Skip a whole subtree" → `await walk({ data, objectCallback })`; call `reject()` at the right key
   - "Await something inside the walk" (DB lookup, fetch, fs.readFile) → `await walk({ data, keyCallback: async ({ resolve, value, key }) => { const fresh = await fetch(value); resolve(fresh) } })`
   - "Run a function on every leaf" (deep `forEach` with side effects) → `await walk({ data, keyCallback })`; the callback must still call `resolve(value)` (see gotcha below)

2. **Generate code that follows the real API contract**:
   - ESM import: `import walk from '@peter.naydenov/walk-async'` (CJS: `require('@peter.naydenov/walk-async')`)
   - **The call returns a Promise** — `await` it, or chain `.then`. Forgetting this is the #1 mistake.
   - Options shape: `{ data, keyCallback?, objectCallback?, timeout? }`. Same names as the sync `walk`, plus `timeout`.
   - Callback signature is `({ value, key, breadcrumbs, resolve, reject }, ...args)`. Always destructure the five fields from the first arg.
   - Extra positional args passed to `walk` are forwarded to both callbacks as `...args`. Use this for context the callbacks need but you don't want to close over.
   - **There is no `IGNORE` symbol.** The way to drop a key is `reject()` — that's it. The internal `IGNORE = Symbol('ignore___')` is private implementation detail; do not import, construct, or return it from user code. Returning it from a callback is a bug (it would be treated as a value to store, not a drop signal).
   - The callback MUST call `resolve(...)` or `reject()` on every code path. If it doesn't, the walk promise never settles. The `timeout` option is the recommended way to catch this in development.
   - `resolve` accepts anything a sync `walk` would accept: a primitive, a built-in like `Date` / `Map` / `Set`, or a plain object/array. A plain object/array is walked into (deferred). A `Date` / `Map` / `Set` is stored by reference.

3. **Apply the order-of-execution rules**:
   - Within one level, keys are visited in `Object.keys` order on the current object/array.
   - A level finishes before any nested walk starts. The new walk into a returned object/array is deferred.
   - For the same value, `objectCallback` runs before `keyCallback`. If `objectCallback` resolves a new object, that object is what `keyCallback` sees when it processes the children.
   - The root goes through `objectCallback` first (if defined), then its children are walked. Rejecting from the root `objectCallback` short-circuits the whole walk to `[]` (for array roots) or `{}` (for object roots).
   - **Within a level, all keys are started concurrently** — they don't wait for each other to resolve before the next one is fired. They just have to finish before the next level begins. (This is the part where the async version earns its keep — `await` work in callbacks runs in parallel for free.)

4. **Surface only the relevant gotcha proactively** — pick at most one from the list below that applies to the current example, and only if the user is unlikely to know it:
   - **The biggest trap: `walk-async` is `await`able.** A no-`await` call silently drops the result. `walk(...)` alone returns a Promise, not the copy.
   - **Don't return values from callbacks.** Returning `value` or `IGNORE` from a callback is a sync-API leak — the walk ignores the return. The right call is `resolve(value)` or `reject()`. If a user just ported from sync `walk` and writes `return value` in their callback, their result will be `{}` (the empty container, because nothing was ever stored).
   - **Callbacks must call `resolve` or `reject` on every code path.** A path that returns early or `throw`s without calling either will leave the walk promise pending forever. Either wire every path explicitly, or set `timeout` during development to surface these as a clear rejection with breadcrumbs of the stuck callbacks.
   - **Don't `await walk-async` from inside a callback.** That's the first item on the Limitations list in the README — it corrupts the in-progress walk. If you need recursion, let the library handle it by `resolve`-ing a plain object/array from the callback.
   - **Built-in types are not walked.** `Date`, `RegExp`, `Map`, `Set`, `WeakMap`, `WeakSet`, `ArrayBuffer`, `DataView`, typed arrays, DOM nodes, and functions are passed by reference. If the user wants a deep clone of a `Map`/`Set`/typed array, recommend `structuredClone` for that subtree, or do it themselves before calling `walk-async`.
   - **`'simple'` is the storage type, not the return type.** A plain object or array resolved from `keyCallback` is re-typed and walked into (deferred). A `Date` resolved from `keyCallback` is `'simple'` and stored by reference. This is the v6.1.0 contract.

5. **If the request is "I just need a deep clone with no transforms"** (or the user doesn't actually need async), point them at `structuredClone` first (built into the platform, no dependency, no promise), and mention the sync `walk` as a fallback. Only use `walk-async` when real async I/O is happening inside the callbacks.

6. **If the request is for a sync walk**, route to `@peter.naydenov/walk` (separate package, similar interface, no promise machinery). The two are kept in sync semantically — same callback args, same three-outcome contract — but the sync version is faster when you don't need `await`.

## Output contract

- One focused code snippet, ESM by default (CJS if asked)
- The snippet must `await` the `walk` call (or chain `.then`); never produce a snippet that calls `walk` and ignores the returned Promise
- One line of context explaining which option(s) are used and why
- A pointer to the relevant source/test section if the developer wants to dig deeper
- Surface at most one relevant gotcha proactively, only if it applies to the example
- Never include a code example that uses `return value` / `return IGNORE` from a callback (those are the sync API)
- Never include a code example that `await`s `walk-async` from inside one of its own callbacks

## Failure handling

- The developer's use case genuinely ambiguous (e.g., "deep clone this") → point them at `structuredClone` for the no-deps no-callback case, then `walk-async` only if they want callbacks that `await`
- Developer reports a bug or unexpected behavior in `walk-async` itself → do NOT try to fix from this skill; route to the project source or maintainer
- Developer wants a walk that never settles, or hits the timeout, or sees the "callbacks still pending" error → point at the `Timeout` section in the README and the callback "every code path resolves" rule
- Developer asks for an API `walk-async` doesn't have (e.g., `walk.pick(...)`, `walk.omit(...)`) → do not invent it; point at the callback-factory pattern in the README ("Why one callback, not a list of methods" section) where such helpers belong outside the library

## Examples

**"Fetch fresh data for every URL string in the object, drop the rest"**

```js
import walk from '@peter.naydenov/walk-async'

const result = await walk({
  data: source,
  keyCallback: async ({ value, resolve, reject }) => {
    if (typeof value !== 'string' || !/^https?:\/\//.test(value)) {
      reject()                                          // drop non-URL primitives
      return
    }
    try {
      const r = await fetch(value)
      resolve(await r.json())
    } catch (e) {
      reject()                                          // drop on network failure
    }
  },
  timeout: 5000,    // surfaces forgotten resolve/reject with breadcrumbs
})
```

`await` is mandatory — without it you have a Promise, not a result. `reject()` (no argument) is the only way to drop a key. The `timeout` is a debugging safety net; remove or raise it for production. See `test/04-async.test.js` for the executable pattern.

**"Drop a whole `metadata` subtree"**

```js
import walk from '@peter.naydenov/walk-async'

const result = await walk({
  data: user,
  objectCallback: ({ key, value, resolve, reject }) =>
    key === 'metadata' ? reject() : resolve(value)
})
```

Rejecting from `objectCallback` drops the entire subtree (not just the immediate property). `keyCallback` is not used here, so primitive keys inside `metadata` are never visited. See `test/03-objectCallback.test.js`.

**"Deep `forEach` — log every leaf"**

```js
import walk from '@peter.naydenov/walk-async'

await walk({
  data: tree,
  keyCallback: ({ value, key, breadcrumbs, resolve }) => {
    console.log(`${breadcrumbs}/${key} = ${value}`)
    resolve(value)   // pass-through — required, otherwise this key is dropped
  }
})
```

The callback MUST call `resolve` or `reject` on every code path. A missing call leaves the walk pending — if you suspect this in your own code, set `timeout: 1000` during dev and look at which callback the rejection names. The `breadcrumbs` argument is a slash-delimited path starting with `'root'`, e.g. `'root/props/age'`. See "Deep 'forEach'" in `README.md`.

**"Port a sync `walk` call to `walk-async`"**

```js
// walk (sync)
const result = walk ({
  data: user,
  keyCallback: ({ value, key, IGNORE }) => key === 'password' ? IGNORE : value
})

// walk-async — same shape, just promise-based
const result = await walk ({
  data: user,
  keyCallback: ({ value, key, resolve, reject }) => {
    if ( key === 'password' )   reject ()   // was: return IGNORE
    else                       resolve ( value )  // was: return value
  }
})
```

The mechanical translation: `return X` → `resolve(X)`, `return IGNORE` → `reject()`. Add `await` to the call. Add `timeout` during dev to surface any path that forgets to resolve/reject. The "Migrating from `@peter.naydenov/walk`" section in `README.md` has the full table.

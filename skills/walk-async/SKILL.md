---
name: walk-async
description: >-
  Uses @peter.naydenov/walk-async to copy, transform, filter, or inspect nested
  JavaScript data with awaited callbacks. Use for deep copies with transformations,
  masking or removing nested fields, pruning branches, deep forEach, and
  early-stop searches. Applies to the async Walk API, not synchronous
  traversal or independent cloning of built-in objects such as Map and Date.
---

# Walk Async

Write traversal rules with `@peter.naydenov/walk-async`. Walk handles the nesting
and builds an editable copy by default. This skill covers the upcoming version
7 API in this repository.
Await the walk to obtain the result or finish its side effects.

## Choose the call

| Intent | Use |
| --- | --- |
| Copy nested objects and arrays | `await walk ({ data })` |
| Transform, mask, or remove leaves | `keyCallback` |
| Await a lookup while copying | An async callback that returns its awaited result |
| Replace a container or remove a branch | `objectCallback` |
| Inspect without building a copy | `settings:{ copy:false }` |
| Skip immediate key callbacks but visit nested containers | Return `PASS()` or `PASS(value)` from `objectCallback` |
| Stop at a match | Return `FINISH()` or `FINISH(value)` |

For example, mask passwords at any depth:

```js
import walk from '@peter.naydenov/walk-async'

let data = { user:{ password:'secret', name:'Peter' } };
let result = await walk ({
                          data
                        , keyCallback : ({ key, value }) => key === 'password' ? '[hidden]' : value
                    })
// { user:{ password:'[hidden]', name:'Peter' } }
```

## Essential rules

- Return the intended value when copying. `null` and `undefined` are values,
  not instructions to remove a property.
- Call and return helper instructions: `return IGNORE()`, `return PASS()`,
  or `return FINISH()`, or pass the instruction to `resolve`. Merely calling
  a helper has no traversal effect. Promised replacement payloads are awaited.
- An object callback must return or resolve a container to continue into it,
  including when `copy:false`. A leaf callback used only for side effects
  may omit its return in that mode. Walk then resolves `undefined`.
- Return new containers to avoid mutating source data. Built-in objects and
  functions are leaves preserved by reference; this is not a full graph clone.
- Each callback completes before the next starts; sibling callbacks do not
  run concurrently. Throws and rejected promises reject the walk.
- Existing `resolve`/`reject` callbacks remain supported. Reading either field
  selects explicit settlement; settle every path and leave unused fields alone.
  `reject()` prunes the current value; throw to fail the walk.
- Use `@peter.naydenov/walk` for work that completes synchronously.
  Do not invent methods such as `walk.pick()`.

## Read the relevant reference

Read only the files needed for the request. Resolve these links relative to
this skill folder; they remain usable when the folder is installed elsewhere.

- [Callbacks and copying](references/callbacks.md): callback arguments,
  return values, explicit settlement, errors, timeout, and queued visit order.
- [Traversal controls](references/control-flow.md): `IGNORE`, local `PASS`,
  both `FINISH` forms, `isFinished`, and partially completed results.
- [Paths, settings, and cycles](references/settings.md): `parentPath`,
  breadcrumbs, performance switches, circular links, and shared references.
- [Runnable examples](references/examples.md): input and output examples
  for filtering, pruning, local skipping, searching, and final branches.

## Deliver the solution

Provide focused code in the developer's existing style, using ESM by default.
Explain the selected callback or setting and any limitation relevant to the
task. Prefer one walk with combined rules when it satisfies the request;
finite awaited nested walks are supported when needed. Explain speed through
work avoided, without claiming a universal advantage over other libraries.

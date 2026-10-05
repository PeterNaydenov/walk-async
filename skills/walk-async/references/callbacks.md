# Callbacks and copying

## Contents

- [Import and signature](#import-and-signature)
- [Return values](#return-values)
- [What is copied](#what-is-copied)
- [Visit order](#visit-order)
- [Explicit settlement](#explicit-settlement)
- [Errors and timeout](#errors-and-timeout)

## Import and signature

```js
import walk from '@peter.naydenov/walk-async'
// CommonJS: const walk = require ( '@peter.naydenov/walk-async' )

let result = await walk ({ data, keyCallback, objectCallback, settings, timeout }, ...args)
```

The signature is `walk(options, ...args)` and it returns a Promise. Only
`data` is required. Await the call to obtain the copy or finish side effects.
Extra positional arguments are forwarded to both callbacks after their
arguments object, in the same order.

| Callback | Receives | Additional fields |
| --- | --- | --- |
| `keyCallback` | Leaves: primitives, functions, and supported built-in values | `isFinished` |
| `objectCallback` | Object and array containers, including the root | `PASS` |

Both receive `value`, string `key`, `IGNORE`, `FINISH`, and the async-only
`resolve` and `reject` settlement fields. `breadcrumbs` and read-only
`parentPath` are present unless disabled. The root object
callback's key is `'root'`. Helpers are supplied to callbacks, not imported
as named exports. `isFinished` is normally `false` in key callbacks.

## Return values

Both plain returns and returned promises are awaited before interpretation.
When copying, return the value to keep. Returning `null` or `undefined`
stores it. Return `IGNORE()` to remove the current property or branch.

- A plain object or array returned by either callback is traversed and
  copied. Its children receive callbacks. A container returned by
  `keyCallback` does not itself receive another `objectCallback` call.
- A simple replacement returned by `objectCallback` goes to `keyCallback`
  when key callbacks are active for its parent. A `PASS` instruction skips
  that call. Simple root replacements resolve directly.
- Built-in replacements remain leaves and are stored by reference.
- In no-copy mode, returns still control traversal but are never assigned
  to the source. Leaf callbacks used for side effects may omit their return.
  Object callbacks must return a container to continue into it.
- A primitive or built-in root resolves directly without callbacks;
  with `copy:false`, the walk always resolves `undefined`.
- Root `IGNORE()` produces an empty object or array matching the input
  root when copying, or `undefined` without copying.

`IGNORE`, `PASS`, and `FINISH` must be called and their results returned or
passed to `resolve`.
Returning the function itself is an ordinary function value. When moving
from synchronous v6, change `return IGNORE` to `return IGNORE()`; async v6
used `reject()`, which remains supported.

## What is copied

Walk copies own enumerable string-keyed properties into new editable object
and array containers. It does not preserve prototypes, property descriptors,
non-enumerable properties, or symbol-keyed properties. Enumerable getters
are read once per visited property.

`Date`, `RegExp`, `Map`, `Set`, `WeakMap`, `WeakSet`, `ArrayBuffer`,
`DataView`, typed arrays, DOM nodes, and functions remain the same references.
Their internal contents are not visited. Use an appropriate independent
clone operation when the task requires cloning those built-in contents.

Callbacks receive source or replacement values. Mutating them may mutate
the original data; return a replacement instead when preservation matters.
Walk does not freeze the result.

Array traversal uses input index strings. Removed items and sparse holes
are compacted in the result; non-index enumerable properties keep their
names. Own `__proto__` keys are copied as data properties.

## Visit order

Within a container, properties follow `Object.keys` order. Object callbacks
run before the corresponding container's contents. Contents are queued and
processed later in scheduling order; this is not recursive depth-first order.

For `{ first:{ a:1 }, second:{ b:2 } }`, ordinary callback order is:

```text
object root
object first
object second
key a
key b
```

Do not treat the next object callback as a signal that the previous
container's keys are complete. Callback values are input or replacement
values, not completed transformed subtrees. Walk has no post-order callback.

Await each callback before starting the next; siblings do not overlap.
Returned containers follow the same queue order. Finite awaited nested walks
have their own queue, ancestors, and finish state. Walk has no exit callback.
Use `@peter.naydenov/walk` when callbacks do not need asynchronous work.

## Explicit settlement

Version 6 callbacks can still use `resolve(value)` or `reject()`. Reading or
destructuring either field selects explicit settlement for that invocation.
Settle every path with one of them; the callback's normal return is then
ignored. Spreading the entire arguments object also reads these getters and
selects explicit settlement. Do not read unused fields in return-based code.

`resolve` awaits supplied promises and consumes helper instructions, including
`resolve ( IGNORE() )`, `resolve ( PASS(value) )` in object callbacks, and
`resolve ( FINISH(value) )`. Callback completion is still awaited when an async
callback calls `resolve` early. `reject()` drops the current key or branch,
equivalent to `IGNORE()`; its optional reason does not reject the walk.

## Errors and timeout

Throwing or returning a rejected promise rejects the walk, including failures
from awaited nested walks or promised instruction payloads. Catch only when
recovery or pruning is intended; `reject()` is traversal control, not failure.

`timeout` is an optional number of milliseconds for the whole walk, supplied
beside `data`, not inside `settings`. If time expires, the walk rejects with
pending callback paths, or keys when breadcrumbs are disabled. It covers
forgotten explicit settlement, unresolved callback returns, and unresolved
PASS or FINISH payloads. The timer is cleared after success or failure.
Timeout does not cancel callback I/O or stop the underlying traversal; arrange
cancellation in application code when required. No timeout is set by default.

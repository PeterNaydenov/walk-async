# Walk-async (@peter.naydenov/walk-async)

![version](https://img.shields.io/github/package-json/v/peterNaydenov/walk-async)
![license](https://img.shields.io/github/license/peterNaydenov/walk-async)
![GitHub issues](https://img.shields.io/github/issues/peterNaydenov/walk-async)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40peter.naydenov%2Fwalk-async)

`walk-async` visits every member of a JavaScript data structure **once**, in a single pass. Two callbacks run during the visit:

- `objectCallback` fires on every object or array (including the root)
- `keyCallback` fires on every primitive property

Both callbacks can `resolve` a new value (mask, filter, or substitute) or `reject` to drop the key. Callbacks are async — they can `await` work, talk to the network, read files, anything — and the walk is built so a single pass collects all the transformations you need. The deep copy of the original data is mostly a side-effect: the real power of `walk-async` is the ability to do all your modifications in one pass, with full freedom inside a single callback.

```js

  walk ({
            data             // (required) Any JS data structure;
          , objectCallback   // (optional) Function executed on each object/array property;
          , keyCallback      // (optional) Function executed on each primitive property;
          , timeout          // (optional) Milliseconds. Reject the promise if callbacks do not resolve in time;
      })
    .then ( result => {
                              // `result` is an immutable copy of `data` if callbacks are absent
                              // or resolve with the original `value` unchanged.
      })
```

> **When to use `walk-async` vs `structuredClone`.**
> `structuredClone` is built into modern browsers and Node 17+ and is the right tool when you just need a deep copy. Reach for `walk-async` when you want to **modify particular properties, set values conditionally, or skip whole branches** during the copy — all in a single pass over the data — and your callbacks need to do async work. If you don't need callbacks, or you don't need async, `walk-async` is overkill: use `structuredClone` for the simple case, or use the sibling [`@peter.naydenov/walk`](https://github.com/PeterNaydenov/walk) for sync callbacks.


## Order of execution

A few invariants to keep in mind — they shape the order in which your callbacks fire and are easier to reason about up front than to discover in the source:

- **Within one level, keys are visited in `Object.keys` order.** That's the order of own enumerable string keys on the current object/array.
- **A level finishes before any nested walk starts.** When `walk-async` hits an object/array value (original or returned by a callback), it allocates the result container and defers the nested walk. The nested walk runs after the current level's iteration completes. New objects/arrays returned by `keyCallback` or `objectCallback` are scheduled the same way, so the iteration order of the current level is preserved.
- **`objectCallback` runs before `keyCallback` on the same value.** For every object/array, `objectCallback` fires first; if it resolves with a new object, that object is what gets walked; its primitive children are then handed to `keyCallback`.
- **The root is treated as a normal object/array.** When `data` is an object/array, the root goes through `objectCallback` first (if defined), then its children are walked. Rejecting from the root `objectCallback` short-circuits the whole walk to an empty result.

Because callbacks are async, the same level's keys are started concurrently in `Object.keys` order — they don't have to wait for each other to resolve before the next one is fired. They just have to finish before the next level begins.


## keyCallback
`walk-async` visits each member of the data once. `keyCallback` fires on every primitive property — types: *string, number, bigint, boolean, symbol, null, undefined, function*. Object and array values are visited by `objectCallback` instead (see below). Built-in types like `Date`, `Map`, `Set`, and typed arrays arrive at `keyCallback` as primitives and are passed through by reference — see [Built-in types](#built-in-types-date-regexp-map-set-typed-arrays-etc) below.

The value you `resolve` becomes the new value at that key:

- **Resolve a primitive (or a built-in like `Date` / `Map` / `Set`)** → stored as-is. Walk does not descend into it;
- **Resolve a plain object or array** → walk continues into it with `objectCallback` and `keyCallback` applied to its children (same as any original nested object/array). The new walk is deferred via the `extend` mechanism, so the iteration order of the current level is preserved;
- **`reject()`** → that key is dropped from the result.

```js
function keyCallbackFn ({ value, key, breadcrumbs, resolve, reject }) {
      // value: value of the property;
      // key:  key of the property;
      // breadcrumbs: location of the property;
      // resolve: function. Call it with the new value to store at that key;
      // reject: function. Call it to drop the key from the result;
      // Important: key callback should be resolved or rejected on every code path,
      // otherwise the walk promise never settles. See section "Timeout".
  }

const result = await walk ({ data, keyCallback : keyCallbackFn });  // It's the short way to provide only key-callback. Callback functions are optional.
// walk ({ data, keyCallback, objectCallback });  // If both callbacks are available
```


## objectCallback

Optional callback function that is started on each object or array property, including the root. The value you `resolve` becomes the new value at that key:

- **Resolve an object or array** → walk continues into it with the other callbacks applied to its children;
- **Resolve a primitive** (string, number, `null`, etc.) → it is stored at that key as-is, and walk does not descend into it (primitives have no children to walk);
- **`reject()`** → that key is dropped from the result.

```js
function objectCallbackFn ({ value, key, breadcrumbs, resolve, reject }) {
      // value: each object/array during the walk;
      // key: key of the object/array;
      // breadcrumbs: location of the object;
      // resolve: function. Call it with the new value to store at that key;
      // reject: function. Call it to drop the key from the result;
      // Important: Object callback should be resolved or rejected on every code path,
      // otherwise the walk promise never settles. See section "Timeout".
}

walk ({
          data
        , keyCallback: keyCallbackFn
        , objectCallback : objectCallbackFn
    })
  .then ( resultOfWalk => {
            // do something with the result of walk
      })
```

**IMPORTANT: Object-callbacks are executed always before key-callbacks. If we have both callbacks, then key-callbacks will be executed on the result of object-callback.**

Skip key-callbacks by not providing a keyCallback function:
```js
 let result = await walk ({ data })   // ignore key-callbacks
```


## Why one callback, not a list of methods

`walk-async` is built around a single pass over the data — every member is visited exactly once, no matter how many transformations the callbacks perform. This is the whole reason the API exposes a callback (or two, for objects vs primitives) and not a bag of pre-built methods like `omit`, `pick`, or `set`.

Each pre-built method would be another pass over the data: dropping one key, then renaming another, then masking a third — that's three O(n) cycles where one would do. With async callbacks the cost is even worse, because each extra pass pays the full round-trip of every awaited I/O operation. The cost compounds with every method you chain, and on large data it gets expensive fast.

A single `keyCallback` (and optionally `objectCallback`) lets you do every transformation you need in the same pass — drop a key, mask a value, rename another, conditionally remove a subtree, await an API call to enrich a field — all together, no extra cycles.

If you find yourself wanting a named transformation you can reuse, the natural place for it is a **callback factory**: a function that returns a `keyCallback` / `objectCallback`. Such factories can live in a separate package; they don't need to extend `walk-async` itself.

```js
// Example callback factory — not part of walk-async
function omitKeys (...keysToDrop) {
    const set = new Set ( keysToDrop )
    return ({ key, value, resolve, reject }) => {
        if ( set.has ( key ) )   reject ()
        else                     resolve ( value )
    }
}

const result = await walk ({
      data: user
    , keyCallback: omitKeys ( 'password', 'token' )
})
```


## Installation

Install for node.js projects by writing in your terminal:

```
npm install @peter.naydenov/walk-async
```

Once it has been installed, it can be used by writing this line of JavaScript:
```js
let walk = require ( '@peter.naydenov/walk-async' )
```

or

```js
import walk from '@peter.naydenov/walk-async'
```

**Installation for browsers**: Get the file `"dist/walk-async.min.js"` and put it inside the project. Request the file from HTML page. Global variable 'walk' is available for use.

        Note:
        Library is using 'generator functions'. If support for old browsers
        is required, add a polyfill for 'generators'.




## How to use it

### Deep copy
```js
const myCopy = await walk ({ data:x })   // where x is some javascript data structure
```


### Built-in types (Date, RegExp, Map, Set, typed arrays, etc.)
`walk-async` operates on the own-enumerable-string-key model. Values whose data lives outside that model are **preserved by reference** — the same instance appears in the result:

| Type                                     | Behavior                                  |
| ---------------------------------------- | ----------------------------------------- |
| `Date`, `RegExp`                         | Passed by reference                       |
| `Map`, `Set`, `WeakMap`, `WeakSet`       | Passed by reference                       |
| `ArrayBuffer`, `DataView`, typed arrays  | Passed by reference                       |
| DOM nodes (`HTMLElement`, etc.)          | Passed by reference                       |
| Functions                                | Passed by reference                       |

```js
const x = { when: new Date ( '2024-01-15' ), tags: new Set ([ 'js' ]) }
const r = await walk ({ data: x })
r.when === x.when   // true  — same Date instance
r.tags === x.tags   // true  — same Set instance
```

This is the same contract used by `function` values and DOM nodes. If you need a deep copy of a `Map`/`Set`/typed array, do it yourself before calling `walk-async`, or use the platform `structuredClone` for those particular subtrees.


### Deep 'forEach'
`keyCallback` can be used as a deep `forEach` over every primitive property of the data — no matter how deeply nested. Unlike a plain `forEach`, **the callback must call `resolve` or `reject` on every code path**: that resolution is what tells `walk-async` the per-key work is done. To walk without changing anything, `resolve(value)`.

```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 47
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };

function keyFn ({ value, key, breadcrumbs, resolve }) {
              console.log (`${key} ----> ${value}`)   // Show each each primitive couples key->value
              console.log ( `Property location >> ${breadcrumbs}`)
              // example for breadcrumbs: 'age' will looks like this : 'root/props/age'
              resolve ( value )                       // pass-through — required, otherwise the result loses this key
    }

walk ({ data:x, keyCallback: keyFn })
    .then ( result => {
                    // result is a deep copy of x
          })
```

`breadcrumbs` is a slash-delimited path string starting with `root` (e.g. `"root/props/age"`). Use it to know where you are in the structure; you can `.split('/')` it if you need a path array.

> Built-in types (`Date`, `Map`, `Set`, typed arrays, etc.) are reached by `keyCallback` as-is — see [Built-in types](#built-in-types-date-regexp-map-set-typed-arrays-etc) above.


### Skip a branch
Calling `reject()` from `objectCallback` drops the **entire subtree** at that key — not just the immediate property. Use it when you want to cut a whole section out of the result without having to walk into it and reject it key by key.

```js
let x = {
          name      : 'Peter'
        , password  : 'secret'
        , metadata  : {
                          ip      : '1.2.3.4'
                        , session : 'abc-123'
                        , device  : { os: 'mac', browser: 'safari' }
                    }
    };

// Drop a single primitive (use keyCallback)
const r1 = await walk ({
      data: x
    , keyCallback: ({ key, value, resolve, reject }) => {
        if ( key === 'password' )   reject ()
        else                       resolve ( value )
    }
})
// r1.metadata is still fully present; only r1.password is gone.

// Drop an entire subtree (use objectCallback)
const r2 = await walk ({
      data: x
    , objectCallback: ({ key, value, resolve, reject }) => {
        if ( key === 'metadata' )   reject ()
        else                       resolve ( value )
    }
})
// r2.password is still present; the whole r2.metadata subtree is gone.
```

`objectCallback` fires on the root too, so this also works at the top level (e.g. to short-circuit a `walk-async` by rejecting from the root call).


### Ignore a key

```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 47
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };
function keyFn ({value,key,resolve,reject}) {
        if ( key === 'name' )   reject ()
        else                    resolve ( value )
}

walk ({
            data : x
          , keyCallback : keyFn
      })
  .then ( result => {
              // result will copy all properties from x without the property 'name'.
              // result.name === undefined
      })
```


### Mask values

```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 47
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };
walk ({
          data:x
        , keyCallback : ({resolve}) => resolve('xxx')
    })
  .then ( result => {
          // 'result' will have the same structure as 'x' but all values are 'xxx'
          // {
          //      ls    : [ 'xxx','xxx','xxx' ]
          //    , name  : 'xxx'
          //    , props : {
          //                  eyeColor: 'xxx'
          //                , age     : 'xxx'
          //                , height  : 'xxx'
          //                , sizes : ['xxx','xxx','xxx','xxx']
          //             }
          //   }
    })
```

### Change object on condition

```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 48
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };

function objectCallback ({ value:obj, key, resolve }) {
    const {age, height} = obj;
    if ( age && age > 30 ) {
            resolve ({ age, height })
            return
        }
    resolve ( obj )
}

walk ({
          data: x
        , objectCallback
      })
    .then ( result => {
            // 'result.props' will have only 'age' and 'height' properties.
            // {
            //      ls    : [ 1,2,3 ]
            //    , name  : 'Peter'
            //    , props : {
            //                  age     : 48
            //                , height  : 176
            //             }
            //   }
      })
```


## Migrating from `@peter.naydenov/walk`

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


## Timeout

Every callback must call `resolve` or `reject` on every code path. If some path forgets to do it, the promise returned by `walk` will never settle — and by default there is no error and no hint which callback is the reason. The optional `timeout` property (milliseconds) turns that silent hang into a rejection with diagnostics:

```js
function objectCallbackFn ({ value, key, breadcrumbs, resolve, reject }) {
        if ( breadcrumbs === 'root/props' )   return   // BUG: this path never resolves
        resolve ( value )
    }

walk ({ data, objectCallback: objectCallbackFn, timeout: 5000 })
    .catch ( err => {
              console.error ( err.message )
              // walk-async: timed out after 5000ms; callbacks still pending:
              //   - objectCallback at 'root/props'
        })
```

The error message lists the breadcrumbs of every callback that was started but never resolved or rejected, so the broken code path can be found directly.

Notes:
 - `timeout` is disabled by default. Without it the behavior is exactly as before;
 - The limit applies to the whole walk, not to a single callback. Set it well above the worst-case duration of the legitimate async work inside the callbacks — it is a debugging safety net, not a scheduler;
 - When callbacks finish in time, the timer is cleared and the result is delivered as usual.


## Limitations
- `walk-async` does not descend into built-in types (`Date`, `RegExp`, `Map`, `Set`, `WeakMap`, `WeakSet`, `ArrayBuffer`, `DataView`, typed arrays, DOM nodes, functions) — they are passed by reference, whether they appear in the input or are returned by a callback;
- `walk-async` can not execute another `walk-async` from inside the callbacks;
- The walk promise does not settle until every callback has resolved or rejected. Use the `timeout` option to turn a forgotten `resolve`/`reject` into a rejection with diagnostics.


## See also
- [`@peter.naydenov/walk`](https://github.com/PeterNaydenov/walk) — the sync sibling. Same callback shape, same three-outcome contract, no promise machinery. Use it when your callbacks don't need async work.
- [Release history](Changelog.md)


## Credits
'@peter.naydenov/walk-async' was created and supported by Peter Naydenov.

## License
'@peter.naydenov/walk-async' is released under the MIT License.

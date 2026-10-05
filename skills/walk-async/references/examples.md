# Runnable examples

## Contents

- [Remove leaf keys](#remove-leaf-keys)
- [Prune a whole branch](#prune-a-whole-branch)
- [PASS with a replacement](#pass-with-a-replacement)
- [Inspect with a parent path](#inspect-with-a-parent-path)
- [Stop at a matching leaf](#stop-at-a-matching-leaf)
- [Search without copying](#search-without-copying)
- [Process a final branch](#process-a-final-branch)
- [Copy circular and shared references](#copy-circular-and-shared-references)
- [Await a lookup](#await-a-lookup)
- [Use resolve and reject](#use-resolve-and-reject)
- [Settle a final branch payload](#settle-a-final-branch-payload)
- [Observe sequential callbacks](#observe-sequential-callbacks)

Each block is independent and uses the version 7 API. Expected results are
shown below the calls. Preserve the developer's style when adapting them.

## Remove leaf keys

```js
import walk from '@peter.naydenov/walk-async'

let data = { name:'Peter', password:'secret', nested:{ token:'abc', count:2 } };
let result = await walk ({
                          data
                        , keyCallback : ({ key, value, IGNORE }) => {
                                              if ( key === 'password' || key === 'token' )   return IGNORE()
                                              return value
                                          }
                    })
// { name:'Peter', nested:{ count:2 } }
// data still contains password and nested.token.
```

## Prune a whole branch

```js
import walk from '@peter.naydenov/walk-async'

let data = { profile:{ name:'Peter' }, metadata:{ events:[1,2,3] } };
let result = await walk ({
                          data
                        , objectCallback : ({ key, value, IGNORE }) => key === 'metadata' ? IGNORE() : value
                    })
// { profile:{ name:'Peter' } }
// Nothing inside metadata is visited.
```

## PASS with a replacement

```js
import walk from '@peter.naydenov/walk-async'

let data = { branch:{ count:2, nested:{ count:3 } } };
let result = await walk ({
                          data
                        , objectCallback : ({ key, value, PASS }) => {
                                              if ( key === 'branch' )   return PASS ({ ...value, count:100 })
                                              return value
                                          }
                        , keyCallback : ({ value }) => typeof value === 'number' ? value * 2 : value
                    })
// { branch:{ count:100, nested:{ count:6 } } }
// PASS() instead keeps branch.count at 2; nested.count still becomes 6.
```

## Inspect with a parent path

```js
import walk from '@peter.naydenov/walk-async'

let data = { profile:{ age:42 } };
let paths = [];
let result = await walk ({
                          data
                        , settings : { copy:false, breadcrumbs:false }
                        , objectCallback : ({ value }) => value
                        , keyCallback : ({ parentPath, key }) => {
                                              paths.push ([ ...parentPath, key ])
                                          }
                    })
// paths: [['root','profile','age']]
// result: undefined
```

## Stop at a matching leaf

```js
import walk from '@peter.naydenov/walk-async'

let data = [12,22,33,44,55,66];
let result = await walk ({
                          data
                        , keyCallback : ({ value, FINISH }) => {
                                              if ( value === 33 )   return FINISH ( value )
                                              return value
                                          }
                    })
// [12,22,33]
// Return FINISH() instead to produce [12,22].
```

## Search without copying

```js
import walk from '@peter.naydenov/walk-async'

let data = { a:12, nested:{ b:33, c:44 } };
let found;
let result = await walk ({
                          data
                        , settings : { copy:false, breadcrumbs:false, parentPath:false }
                        , keyCallback : ({ value, FINISH }) => {
                                              if ( value !== 33 )   return
                                              found = value
                                              return FINISH()
                                          }
                    })
// found: 33
// result: undefined
```

## Process a final branch

```js
import walk from '@peter.naydenov/walk-async'

let data = { a:12, c:{ internal:44, in1:'bbb', in2:'ccc' }, later:99 };
let result = await walk ({
                          data
                        , objectCallback : ({ key, value, FINISH }) => key === 'c' ? FINISH ( value ) : value
                        , keyCallback : ({ key, value, isFinished, IGNORE }) => {
                                              if ( isFinished && key !== 'internal' )   return IGNORE()
                                              return value
                                          }
                    })
// { a:12, c:{ internal:44 } }
// Key callbacks in c receive isFinished:true; later is not visited.
```

To select just the first final leaf and stop, return `FINISH(value)` from
that final key callback. Its order follows `Object.keys`, so select by key
when a particular property is required. Nested containers in the selected
branch still have their leaves visited, without further object callbacks.

## Copy circular and shared references

```js
import walk from '@peter.naydenov/walk-async'

let shared = { count:1 };
let data = { a:shared, b:shared };
data.self = data

let result = await walk ({ data })
// result !== data
// result.self === result
// result.a !== result.b
// result.a and result.b both contain { count:1 }.
```

## Await a lookup

```js
import walk from '@peter.naydenov/walk-async'

async function lookupUser ( id ) {
    return await Promise.resolve ({ id, active:true })
} // lookupUser func.

let data = { userId:42, nested:{ userId:7 } };
let result = await walk ({
                          data
                        , keyCallback : async ({ key, value }) => {
                                              if ( key === 'userId' )   return await lookupUser ( value )
                                              return value
                                          }
                    })
// { userId:{ id:42, active:true }, nested:{ userId:{ id:7, active:true } } }
```

The local lookup stands in for an awaited service call. Returned containers
are visited; only keys named userId start lookups, so their generated leaves
do not trigger the lookup again. Errors propagate to the caller.

## Use resolve and reject

```js
import walk from '@peter.naydenov/walk-async'

let data = { number:2, password:'secret', nested:{ number:3 } };
let result = await walk ({
                          data
                        , keyCallback : ({ key, value, resolve, reject }) => {
                                              if ( key === 'password' )   reject()
                                              else                       resolve ( Promise.resolve ( value * 2 ) )
                                          }
                    })
// { number:4, nested:{ number:6 } }
```

These fields select explicit settlement, so every callback path settles.
`reject()` prunes a leaf. Throw or return a rejected promise to fail the walk.
Return-based callbacks should leave these fields unread.

## Settle a final branch payload

```js
import walk from '@peter.naydenov/walk-async'

let data = { final:{ original:1 }, later:99 };
let flags = [];
let result = await walk ({
                          data
                        , objectCallback : ({ key, value, FINISH, resolve }) => {
                                              resolve ( key === 'final' ? FINISH ( Promise.resolve ({ first:2, nested:{ number:3 } }) ) : value )
                                          }
                        , keyCallback : async ({ value, isFinished }) => {
                                              flags.push ( isFinished )
                                              return await Promise.resolve ( value * 10 )
                                          }
                    })
// { final:{ first:20, nested:{ number:30 } } }
// flags: [true,true]; later and final-branch object callbacks do not run.
```

## Observe sequential callbacks

```js
import walk from '@peter.naydenov/walk-async'

let data = { first:{ a:1 }, second:{ b:2 } };
let visits = [];
let result = await walk ({
                          data
                        , objectCallback : async ({ key, value }) => {
                                              visits.push ( 'object ' + key )
                                              await Promise.resolve()
                                              return value
                                          }
                        , keyCallback : async ({ key, value }) => {
                                              visits.push ( 'key ' + key )
                                              await Promise.resolve()
                                              return value
                                          }
                    })
// visits: ['object root','object first','object second','key a','key b']
// result: { first:{ a:1 }, second:{ b:2 } }
```

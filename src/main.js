
/**
 *     walk-async
 *
 *     Alternative of deep-copy that provides much better control during creation of immutable
 *     copies of javascript data structures.
 *     Library is using 'generator functions'. If support for old browsers is required,
 *     add a polyfill for 'generators'.
 *
 *     History notes:
 *        - Walk-async was born on September 18th, 2022
 *        - Converted to ES module on January 1st, 2024
 *
 */


import askForPromise from "ask-for-promise"

/**
 *  Resolve the callback with the new value to store at the current key:
 *    - resolving a primitive (or a built-in like `Date` / `Map` / `Set`) → stored as-is by reference;
 *    - resolving a plain object or array → walk continues into it with the other callback applied to its children;
 *
 *  You must call `resolve` or `reject` on every code path — otherwise the walk promise never settles
 *  (use the `timeout` option to turn that silent hang into a rejection with diagnostics).
 *
 *  @callback Resolve
 *  @param {*} value
 *  @returns {void}
 */

/**
 *  Reject the callback. The current key is dropped from the result.
 *
 *  @callback Reject
 *  @param {*} [reason]
 *  @returns {void}
 */

/**
 *  Arguments object received by both `keyCallback` and `objectCallback`.
 *
 *  @typedef {object} CallbackArgs
 *  @property {*}          value        - The current value being processed.
 *  @property {string}     key          - Property key as a string.
 *  @property {string}     breadcrumbs  - Slash-delimited path to the current key, starting with `root` (e.g. `"root/props/age"`).
 *  @property {Resolve}    resolve      - Resolve the callback with the new value (see `Resolve` typedef).
 *  @property {Reject}     reject       - Reject the callback to drop the current key (see `Reject` typedef).
 */

/**
 *  Called once per primitive property (string, number, bigint, boolean,
 *  symbol, null, undefined, function, Date, RegExp, Map, Set, WeakMap,
 *  WeakSet, ArrayBuffer, DataView, typed arrays, DOM nodes).
 *
 *  Resolve with the new value to store, or reject to drop the key:
 *    - resolve a primitive (or a built-in like `Date` / `Map` / `Set`) → stored as-is by reference;
 *    - resolve a plain object or array → walk continues into it with the other callback applied to its children;
 *    - reject → that key is dropped from the result.
 *
 *  @callback KeyCallback
 *  @param {CallbackArgs} args
 *  @param {...*}         rest - Any extra arguments passed to `walk()` are forwarded to the callback.
 *  @returns {void}
 */

/**
 *  Called once per object or array property, including the root.
 *  The resolved value becomes the new value at that key:
 *    - resolve an object or array → walk continues into it with the other callbacks applied to its children;
 *    - resolve a primitive        → it is stored at that key as-is, and walk does not descend into it (primitives have no children to walk);
 *    - reject                     → the key is dropped from the result.
 *
 *  @callback ObjectCallback
 *  @param {CallbackArgs} args
 *  @param {...*}         rest
 *  @returns {void}
 */

/**
 *  @typedef {object} Options
 *  @property {*}             data           - Required. Any JS data structure that will be copied.
 *  @property {KeyCallback}    [keyCallback]    - Optional. Executed on each primitive property.
 *  @property {ObjectCallback} [objectCallback] - Optional. Executed on each object/array property, including the root.
 *  @property {number}         [timeout]         - Optional. Milliseconds. When set, the promise is rejected if callbacks do not resolve in time. Error lists the pending callbacks.
 */


/**
 *  Walk-async
 *
 *  Async sibling of `@peter.naydenov/walk`. Visits every member of a deep
 *  JavaScript data structure once, in a single pass, and runs two optional
 *  callbacks during the visit that can mask, filter, or substitute values
 *  as the result is built.
 *
 *  The deep copy of the original data is mostly a side-effect: the real
 *  power is the ability to do all your modifications in one pass, with full
 *  freedom inside a single callback — now with async work, awaits, and
 *  timeouts supported.
 *
 *  @function walk
 *  @param {Options} options   - Required. Object with required `data` property, two optional callback functions (`keyCallback`, `objectCallback`), and an optional `timeout`.
 *  @param {...*}    args      - Optional. Additional arguments forwarded to both callbacks.
 *  @returns {Promise<*>}      - A promise that resolves to the immutable copy of `options.data` (with the callbacks' transformations applied).
 *  @example
 *  const result = await walk ({
 *      data: someData,
 *      keyCallback:    keyCallbackFn,
 *      objectCallback: objectCallbackFn
 *  })
 */
function walk ({
                  data:origin
                , objectCallback = null
                , keyCallback = null
                , timeout = null
            }, ...args ) {
    let
          type = findType ( origin )
        , result
        , extend = []
        , breadcrumbs = 'root'
        , pending = new Set ()   // Callbacks in flight. Read on timeout to report which ones never resolved.
        , cb = [ keyCallback, objectCallback, pending ]
        , end = askForPromise ()
        , rootTask = askForPromise ()
        , IGNORE = Symbol ( 'ignore___' )
        ;

    if ( type !== 'simple' && objectCallback ) {   // Root object callback. Executed before the result is allocated, so it can replace the root with anything.
            pending.add ( `objectCallback at 'root'` )
            objectCallback ({
                          resolve : rootTask.done
                        , reject  : () => rootTask.done ( IGNORE )
                        , value : origin
                        , key   : 'root'
                        , breadcrumbs
                }, ...args )
        }
    else    rootTask.done ( origin )

    rootTask.onComplete ( item => {
            pending.delete ( `objectCallback at 'root'` )
            if ( item === IGNORE ) {
                    end.done ( ( type === 'array' ) ? [] : {} )
                    return
                }
            switch ( findType ( item ) ) {
                    case 'array'  :
                                        result = []
                                        copyObject ( item, result, extend, cb, breadcrumbs, ...args )
                                            .then ( () => goNext ( extend, result, end ))
                                        break
                    case 'object' :
                                        result = {}
                                        copyObject ( item, result, extend, cb, breadcrumbs, ...args )
                                            .then ( () => {
                                                    goNext ( extend, result, end )
                                                })
                                        break
                    case 'simple' :
                                        end.done ( item )
                } // switch type
        })

    if ( timeout == null )   return end.promise

    const   // Watchdog. 'end.timeout' races 'end.onComplete' against a timer, but leaves 'end.promise' untouched — so return a guard promise fed from the race instead.
          EXPIRED = Symbol ( 'expired___' )
        , guard = askForPromise ()
        ;
    end.timeout ( timeout, EXPIRED )
    end.onComplete ( res => {
            if ( res !== EXPIRED ) {   guard.done ( res );   return   }
            const stuck = [...pending].map ( name => `\n  - ${name}` ).join ( '' )
            guard.cancel ( new Error ( `walk-async: timed out after ${timeout}ms; callbacks still pending:${stuck}` ) )
        })
    return guard.promise
} // walk func.



async function goNext ( extend, result, end ) {
    for await ( const plus of extend ) { 
            await plus.next () 
        }
    end.done ( result )
} // goNext func.



function findType ( x ) {
    if ( x == null              )   return 'simple' // null and undefined
    if ( x.nodeType             )   return 'simple' // DOM node
    if ( x instanceof Array     )   return 'array'
    if ( typeof x === 'object'  ) {
        // Built-in object types whose data lives outside the own-enumerable-string-key
        // model that walk uses. Treated as 'simple' so the value is preserved by
        // reference (same contract as functions and DOM nodes).
        if ( x instanceof Date        )   return 'simple'
        if ( x instanceof RegExp      )   return 'simple'
        if ( x instanceof Map         )   return 'simple'
        if ( x instanceof Set         )   return 'simple'
        if ( x instanceof WeakMap     )   return 'simple'
        if ( x instanceof WeakSet     )   return 'simple'
        if ( x instanceof ArrayBuffer )   return 'simple'
        if ( x instanceof DataView    )   return 'simple'
        if ( ArrayBuffer.isView ( x ) )   return 'simple' // Typed arrays (Uint8Array, Float32Array, ...)
        return 'object'
    }
    return 'simple'   // number, bigint, string, boolean, symbol, function
 } // findType func.



async function* generateList ( data, location, ex, cb, breadcrumbs, args ) {
    yield await copyObject ( data , location, ex, cb, breadcrumbs, ...args )
} // generateList func.


function validateForInsertion ( k, result ) {
    const inArray = result instanceof Array;
    if ( !inArray )   return false
    const isNumber = !isNaN ( k );
    if ( isNumber )   return true
    else              return false
} // insertInArray func.



// Plain assignment of a '__proto__' key triggers the inherited setter and
// replaces the prototype of 'target' instead of creating an own property.
function setKey ( target, k, value ) {
    if ( k === '__proto__' )   Object.defineProperty ( target, k, { value, enumerable:true, writable:true, configurable:true })
    else                       target[k] = value
} // setKey func.



function copyObject ( origin, result, extend, cb, breadcrumbs, ...args ) {
    let
          [ keyCallback, objectCallback, pending ] = cb
        , keys = Object.keys ( origin )
        , executeCallback = askForPromise ( keys )
        , finish = askForPromise ()
        ;
        
    keys.forEach ( (k,i) => {
                    let 
                          type = findType(origin[k])
                        , item  = origin[k]
                        , hasObjectCallback  = ( type !== 'simple' && objectCallback != null )
                        , objectCallbackTask = askForPromise ()
                        , keyCallbackTask    = askForPromise ()
                        , finishWithCallbacks     = askForPromise ()
                        , resultIsArray = (findType (result) === 'array') 
                        , keyNumber = !isNaN ( k )
                        , IGNORE = Symbol ( 'ignore___' )
                        , br = `${breadcrumbs}/${k}`
                        , objectTag = `objectCallback at '${br}'`
                        , keyTag    = `keyCallback at '${br}'`
                        ;

                    if ( hasObjectCallback ) {
                                        pending.add ( objectTag )
                                        objectCallback  ({
                                                              resolve : objectCallbackTask.done
                                                            , reject  : () => objectCallbackTask.done ( IGNORE )
                                                            , value : item
                                                            , key   : k  
                                                            , breadcrumbs : br
                                                }, ...args )
                        }
                    else {
                                        objectCallbackTask.done ( '$$cancel' )
                        }

                    objectCallbackTask.onComplete ( res => {
                                        pending.delete ( objectTag )
                                        if ( res === '$$cancel' && !keyCallback ) {   // deep copy, no callbacks
                                                 keyCallbackTask.done ( '$$noUpdates' )
                                                 return
                                            }
                                        if ( res !== '$$cancel' ) {  
                                                item = res
                                                type = findType ( item )
                                            }
                                        if ( item == IGNORE     ) {
                                                // Object callback rejected this key. Skip the rest of
                                                // the per-key chain; resolve the remaining tasks so
                                                // nothing leaks.
                                                executeCallback.promises[i].done ( 'ignore object' )
                                                keyCallbackTask.done    ( '$$cancel' )
                                                finishWithCallbacks.done ()
                                                return
                                            }
                                        if ( type === 'simple' ) {
                                                    if ( !keyCallback ) { 
                                                            keyCallbackTask.done ( '$$noUpdates' )
                                                            return
                                                        }
                                                    pending.add ( keyTag )
                                                    keyCallback ({
                                                                  resolve  : keyCallbackTask.done
                                                                , reject   : () => keyCallbackTask.done ( IGNORE )
                                                                , value : item
                                                                , key   : k
                                                                , breadcrumbs : br
                                                            }, ...args );
                                            }
                                        else {
                                                    keyCallbackTask.done ( '$$cancel' )
                                            }
                        }) // objectCallbackTask complete

                    keyCallbackTask.onComplete ( value => {
                                        pending.delete ( keyTag )
                                        if ( value == IGNORE ) {
                                                    // Key callback rejected this key. Finish the
                                                    // per-key chain so finishWithCallbacks doesn't leak.
                                                    executeCallback.promises[i].done ( 'ignore key' )
                                                    finishWithCallbacks.done ()
                                                    return
                                            }
                                        if ( value === '$$cancel' ) { 
                                                    finishWithCallbacks.done ()
                                                    return
                                            }
                                        if ( value !== '$$noUpdates' ) {
                                                    item = value
                                                    type = findType ( item )                                            
                                            }
                                        if ( type === 'simple' ) {
                                                    const canInsert = validateForInsertion ( k, result )
                                                    if ( canInsert )  result.push ( item )
                                                    else              setKey ( result, k, item )
                                                    executeCallback.promises[i].done ('key')
                                                    return
                                            }
                                            
                                        finishWithCallbacks.done ()
                        }) // keyCallbackTask complete

                    finishWithCallbacks.onComplete ( () => {
                                        if ( type === 'object' ) {
                                                    const newObject = {};
                                                    if ( resultIsArray && keyNumber )   result.push ( newObject )
                                                    else                                setKey ( result, k, newObject )
                                                    extend.push ( generateList( item, newObject, extend, cb, br, args )   )
                                                    executeCallback.promises[i].done ('object')
                                            }
                                        if ( type === 'array' ) {
                                                    const newArray = [];
                                                    if ( resultIsArray && keyNumber )   result.push ( newArray )
                                                    else                                setKey ( result, k, newArray )
                                                    extend.push ( generateList( item, newArray, extend, cb, br, args )   )
                                                    executeCallback.promises[i].done ('array')
                                            }
                        })
            }) // forEach k
        executeCallback.onComplete ( r =>  finish.done ()   )
        return finish.promise
} // copyObject func.



export default walk



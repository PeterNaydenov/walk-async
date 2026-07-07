
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
 * @typedef {Object} Options
 * @property {Object} data - The data structure to be copied.
 * @property {Function|null} objectCallback - A function called for every object in the data structure.
 * @property {Function|null} keyCallback - A function called for every property in the data structure.
 * @property {number|null} [timeout] - Milliseconds. When set, the promise is rejected if callbacks do not resolve in time. Error lists the pending callbacks.
 */




/**
 * Walk-async is a deep copy function that executes callback functions on every object and property.
 * Callbacks are async functions.
 *
 * @param {Options} options - Object with following properties:
 *                          - data - The data structure to be copied.
 *                          - objectCallback - A function that will be called for every object in the data structure.
 *                          - keyCallback - A function that will be called for every property in the data structure.
 *                          - timeout - Milliseconds. When set, the promise is rejected if callbacks do not resolve in time.
 * @param {...any} args - Any additional arguments will be passed to the callback functions.
 *
 * @returns {Promise} - A promise that resolves to the immutable copy of the data structure.
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
    if ( typeof x === 'object'  )   return 'object'
    return 'simple' // number, bigint, string, boolean, symbol, function 
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
                                                executeCallback.promises[i].done ( 'ignore object' )
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
                                                    executeCallback.promises[i].done ( 'ignore key' )
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



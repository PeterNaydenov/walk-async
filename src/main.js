
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
 */




/**
 * Walk-async is a deep copy function that executes callback functions on every object and property. 
 * Callbacks are async functions. 
 * 
 * @param {Options} options - Object with following properties:
 *                          - data - The data structure to be copied.
 *                          - objectCallback - A function that will be called for every object in the data structure.
 *                          - keyCallback - A function that will be called for every property in the data structure.
 * @param {...any} args - Any additional arguments will be passed to the callback functions.
 * 
 * @returns {Promise} - A promise that resolves to the immutable copy of the data structure.
 */
function walk ({ 
                  data:origin
                , objectCallback = null
                , keyCallback = null
            }, ...args ) {
    let 
          type = findType ( origin )
        , result
        , extend = []
        , breadcrumbs = 'root'
        , cb = [ keyCallback, objectCallback ]
        , end = askForPromise ()
        ;

    switch ( type ) {
            case 'array'  :
                                result = []
                                copyObject ( {root:origin}, result, extend, cb, breadcrumbs, ...args )
                                    .then ( () => goNext ( extend, result, end ))
                                break
            case 'object' :
                                result = {}
                                copyObject ( {root:origin}, result, extend, cb, breadcrumbs, ...args )
                                    .then ( () => {
                                            goNext ( extend, result, end )
                                        })
                                break
            case 'simple' :
                                end.done ( origin ) 
        } // switch type
    return end.promise
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



function copyObject ( origin, result, extend, cb, breadcrumbs, ...args ) {
    let 
          [ keyCallback, objectCallback ] = cb
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
                        , isRoot = (breadcrumbs === 'root' && k === 'root' )
                        , br = isRoot ? 'root' : `${breadcrumbs}/${k}`
                        ;

                    if ( hasObjectCallback ) {
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
                                        if ( isRoot ) {
                                                    extend.push ( generateList ( item, result, extend, cb, 'root', args ) )
                                                    executeCallback.promises[i].done ( 'root' )
                                                    return
                                            }
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
                                                    else              result [k] = item
                                                    executeCallback.promises[i].done ('key')
                                                    return
                                            }
                                            
                                        finishWithCallbacks.done ()
                        }) // keyCallbackTask complete

                    finishWithCallbacks.onComplete ( () => {
                                        if ( type === 'object' ) {
                                                    const newObject = {};
                                                    if ( resultIsArray && keyNumber )   result.push ( newObject )
                                                    else                                result[k] = newObject
                                                    extend.push ( generateList( item, newObject, extend, cb, br, args )   )
                                                    executeCallback.promises[i].done ('object')
                                            }
                                        if ( type === 'array' ) {
                                                    const newArray = [];
                                                    if ( resultIsArray && keyNumber )   result.push ( newArray )
                                                    else                                result[k] = newArray
                                                    extend.push ( generateList( item, newArray, extend, cb, br, args )   )
                                                    executeCallback.promises[i].done ('array')
                                            }
                        })
            }) // forEach k
        executeCallback.onComplete ( r =>  finish.done ()   )
        return finish.promise
} // copyObject func.



export default walk



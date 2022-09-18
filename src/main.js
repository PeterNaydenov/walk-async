
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
 * 
 */



const askForPromise = require ( "ask-for-promise" );



function walk ({ 
                  data:origin
                , objectCallback = null
                , keyCallback = null
            }) {
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
                                copyObject ( origin, result, extend, cb, breadcrumbs )
                                    .then ( () => goNext ( extend, result, end ))
                                break
            case 'object' :
                                result = {}
                                copyObject ( origin, result, extend, cb, breadcrumbs )
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
    if ( x instanceof Array            ) return 'array'
    if ( typeof x === 'object'         ) return 'object'
    return 'simple'
 } // findType func.



async function* generateList ( data, location, ex, cb, breadcrumbs ) {
    yield await copyObject ( data , location, ex, cb, breadcrumbs )  
} // generateList func.


function validateForInsertion ( k, result ) {
    const inArray = result instanceof Array;
    if ( !inArray )   return false
    const isNumber = !isNaN ( k );
    if ( isNumber )   return true
    else              return false
} // insertInArray func.



function copyObject ( origin, result, extend, cb, breadcrumbs ) {
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
                        ;

                    if ( hasObjectCallback ) {
                                        objectCallback  ({
                                                              resolve : objectCallbackTask.done
                                                            , reject  : () => objectCallbackTask.done ( null )
                                                            , value : item
                                                            , key   : k  
                                                            , breadcrumbs : `${breadcrumbs}/${k}`
                                                })
                        }
                    else {
                                        objectCallbackTask.done ( '$$cancel' )
                        }

                    objectCallbackTask.onComplete ( res => {
                                        if ( res !== '$$cancel' ) {  
                                                item = res
                                                type = findType ( item )
                                            }
                                        if ( item == null     ) {  
                                                executeCallback[i].done ()
                                                return
                                            }                                        
                                        if ( type === 'simple' ) {
                                                    if ( !keyCallback )  keyCallbackTask.done ( '$$noUpdates' )
                                                    keyCallback ({
                                                                  resolve  : keyCallbackTask.done
                                                                , reject   : () => keyCallbackTask.done ( null ) 
                                                                , value : item
                                                                , key   : k
                                                                , breadcrumbs : `${breadcrumbs}/${k}`
                                                            });
                                            }
                                        else {
                                                    keyCallbackTask.done ( '$$cancel' )
                                            }
                        }) // objectCallbackTask complete

                    keyCallbackTask.onComplete ( value => {
                                        if ( value == null ) {  
                                                    executeCallback[i].done ( 'nulls' )
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
                                                    if ( canInsert )  result.push ( value )
                                                    else              result [k] = value
                                                    executeCallback[i].done ('key')
                                                    return
                                            }
                                        finishWithCallbacks.done ()
                        }) // keyCallbackTask complete

                    finishWithCallbacks.onComplete ( () => {
                                        if ( type === 'object' ) {
                                                    const newObject = {};
                                                    if ( resultIsArray && keyNumber )   result.push ( newObject )
                                                    else                                result[k] = newObject
                                                    extend.push ( generateList( item, newObject, extend, cb, `${breadcrumbs}/${k}` )   )
                                                    executeCallback[i].done ('object')
                                            }
                                        if ( type === 'array' ) {
                                                    const newArray = [];
                                                    if ( resultIsArray && keyNumber )   result.push ( newArray )
                                                    else                                result[k] = newArray
                                                    extend.push ( generateList( item, newArray, extend, cb, `${breadcrumbs}/${k}` )   )
                                                    executeCallback[i].done ('array')
                                            }
                        })
            }) // forEach k
        executeCallback.onComplete ( r =>  finish.done ()   )
        return finish.promise
} // copyObject func.



module.exports = walk



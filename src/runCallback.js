"use strict"

import IGNORE from "./ignore.js";
import PASS, { isPass } from "./pass.js";
import FINISH, { isFinish } from "./finish.js";



async function runCallback ( callback, context, pending, name, ...args ) {
    let
          task
        , done
        , tag = `${name} at '${context.breadcrumbs ?? context.key}'`
        ;

    // Reading resolve or reject selects the v6 explicit-settlement API.
    // Return-based callbacks need no extra settlement promise.
    function explicit () {
        if ( !task ) {
                task = new Promise ( resolve => { done = resolve } )
                // Observe rejected values immediately, even while the callback
                // is still awaiting other work. The original rejection is
                // propagated when task is awaited below.
                task.catch ( () => {} )
            }
    } // explicit func.

    Object.defineProperties ( context, {
              resolve : {
                          enumerable : true
                        , get : () => { explicit (); return done }
                    }
            , reject : {
                          enumerable : true
                        , get : () => { explicit (); return () => done ( IGNORE() ) }
                    }
        })

    pending.add ( tag )
    try {
            const returned = await callback ( context, ...args );
            const value = task ? await task : returned;
            // Keep the callback pending while an instruction replacement settles too.
            if ( name === 'objectCallback' && isPass ( value ) && value.hasValue )   return PASS ( await value.value )
            if ( isFinish ( value ) && value.hasValue )   return FINISH ( await value.value )
            return value
        }
    finally {
            pending.delete ( tag )
        }
} // runCallback func.



export default runCallback

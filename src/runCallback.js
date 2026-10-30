"use strict"

import IGNORE from "./ignore.js";
import PASS, { isPass } from "./pass.js";
import FINISH, { isFinish } from "./finish.js";
import askForPromise from "ask-for-promise";
import runTask from "./runTask.js";



function runCallback ( callback, context, pending, name, ...args ) {
    return runTask ( run() )

    function* run () {
    let
          task
        , done
        , tag = `${name} at '${context.breadcrumbs ?? context.key}'`
        ;

    // Reading resolve or reject selects the v6 explicit-settlement API.
    // Return-based callbacks need no extra settlement promise.
    function explicit () {
        if ( !task ) {
                task = askForPromise()
                done = task.done
                // Observe rejected values immediately, even while the callback
                // is still awaiting other work. The original rejection is
                // propagated when task is awaited below.
                task.promise.catch ( () => {} )
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
            const returned = yield callback ( context, ...args );
            const value = task ? yield task.promise : returned;
            // Keep the callback pending while an instruction replacement settles too.
            if ( name === 'objectCallback' && isPass ( value ) && value.hasValue )   return PASS ( yield value.value )
            if ( isFinish ( value ) && value.hasValue )   return FINISH ( yield value.value )
            return value
        }
    finally {
            pending.delete ( tag )
        }
    }
} // runCallback func.



export default runCallback

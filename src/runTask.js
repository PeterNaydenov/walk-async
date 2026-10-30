"use strict"

import askForPromise from "ask-for-promise";


// Drive the traversal one step at a time, including promised callback values.
// Each task uses ask-for-promise for settlement and error propagation.
function runTask ( iterator ) {
    const task = askForPromise();

    function step ( method, value ) {
        let next;
        try {
                next = iterator[method] ( value )
            }
        catch ( error ) {
                task.cancel ( error )
                return
            }
        if ( next.done ) {
                task.done ( next.value )
                return
            }
        const pending = askForPromise();
        pending.done ( next.value )
        pending.promise.then ( value => step ( 'next', value ), error => step ( 'throw', error ) )
    }

    step ( 'next' )
    return task.promise
} // runTask func.


export default runTask

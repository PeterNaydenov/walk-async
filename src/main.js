"use strict"

/**
 *     Walk-async
 *
 *     Walk through javascript data structures with callbacks for transforming values,
 *     controlling traversal, and optionally building a copy.
 *     Nested containers are processed iteratively through a work queue.
 *
 *     History notes:
 *        - Walk-async was born on September 18th, 2022
 *        - Converted to ES module on January 1st, 2024
 */



import findType    from "./findType.js";
import copyObject from "./copyObject.js";
import createCallbackArgs from "./createCallbackArgs.js";
import PASS, { isPass } from "./pass.js";
import IGNORE, { isIgnore } from "./ignore.js";
import runCallback from "./runCallback.js";
import { isFinish } from "./finish.js";


/**
 *  Explicitly settle a callback with its current value or a replacement.
 *  Promises supplied to resolve are awaited before traversal continues.
 *
 *  @callback Resolve
 *  @param {*} value
 *  @returns {void}
 */

/**
 *  Drop the current key or entire branch. Retained for v6 callbacks.
 *  To reject the walk itself, throw or return a rejected promise.
 *
 *  @callback Reject
 *  @param {*} [reason]
 *  @returns {void}
 */

/**
 *  Private sentinel returned by IGNORE().
 *
 *  @typedef {symbol} IgnoreToken
 */

/**
 *  Call and return the result to drop the current key or entire branch.
 *
 *  @callback IgnoreFunction
 *  @returns {IgnoreToken}
 */

/**
 *  Call with no arguments to keep the current value, or pass a replacement.
 *  Supplied replacement promises are awaited before traversal continues.
 *  Return the instruction from `objectCallback` to skip `keyCallback` on
 *  its immediate properties. Nested objects and arrays continue normally.
 *
 *  @callback PassFunction
 *  @param {*} [value]
 *  @returns {import('./pass.js').PassInstruction}
 */

/**
 *  Stop the walk, optionally including a final value or branch.
 *  Supplied replacement promises are awaited before traversal continues.
 *
 *  @callback FinishFunction
 *  @param {*} [value]
 *  @returns {import('./finish.js').FinishInstruction}
 */

/**
 *  Shared arguments received by `keyCallback` and `objectCallback`.
 *
 *  @typedef {object} CallbackArgs
 *  @property {*}          value        - The current value being processed.
 *  @property {string}     key          - Property key as a string.
 *  @property {string}     [breadcrumbs] - Slash-delimited path including the current key. Absent when `settings.breadcrumbs` is false.
 *  @property {ReadonlyArray<string>} [parentPath] - Read-only path to the parent, excluding the current key. Absent when `settings.parentPath` is false.
 *  @property {Resolve} resolve - Reading this field opts into explicit settlement with resolve(value) or reject().
 *  @property {Reject} reject - Drop the current key or branch; does not reject the walk promise.
 *  @property {FinishFunction} FINISH - Return FINISH() to omit the current value and stop, or FINISH(value) to include a final value or branch.
 *  @property {IgnoreFunction} IGNORE   - Return IGNORE() from the callback to drop the current key from the result.
 */

/**
 *  @typedef {CallbackArgs & { isFinished: boolean }} KeyCallbackArgs
 */

/**
 *  @typedef {CallbackArgs & { PASS: PassFunction }} ObjectCallbackArgs
 */

/**
 *  Called once per primitive property unless its immediate parent returns
 *  `PASS()` or `PASS(value)` from `objectCallback`. Types: string, number, bigint, boolean,
 *  symbol, null, undefined, function, Date, RegExp, Map, Set, WeakMap,
 *  WeakSet, ArrayBuffer, DataView, typed arrays, DOM nodes.
 *
 *  Return the new value to store, or `IGNORE()` to drop the key:
 *    - return a primitive (or a built-in like `Date`/`Map`/`Set`) → stored as-is by reference;
 *    - return a plain object or array → walk continues into it with the other callback applied to its children;
 *    - return `IGNORE()` → that key is dropped from the result;
 *    - return `FINISH()` → omit the current key and stop the entire walk;
 *    - return `FINISH(value)` → include the supplied value directly and stop, without descending into it.
 *  isFinished is true for keys in a final branch selected by objectCallback.
 *  With settings.copy false, no values are stored; returned containers
 *  still control what gets visited.
 *
 *  @callback KeyCallback
 *  @param {KeyCallbackArgs} args
 *  @param {...*}         rest - Any extra arguments passed to `walk()` are forwarded to the callback.
 *  @returns {* | Promise<*>}
 */

/**
 *  Called once per object or array property, including the root.
 *  The returned value becomes the new value at that key:
 *    - return an object or array → walk continues into it with the other callbacks;
 *    - return a primitive        → passed to `keyCallback` when active, otherwise stored as-is;
 *    - return `IGNORE()`         → the key is dropped from the result.
 *    - return `PASS()`           → keep the current object/array without its immediate key callbacks; nested callbacks continue normally.
 *    - return `PASS(value)`      → use the replacement with the same rule; simple replacements are stored directly.
 *    - return `FINISH()`         → omit the branch and stop the entire walk.
 *    - return `FINISH(value)`    → process only the final branch with keyCallback and isFinished true, suppressing later object callbacks; without keyCallback, include it directly.
 *  With settings.copy false, returned values control traversal without
 *  being stored in a result or assigned to the source.
 *
 *  @callback ObjectCallback
 *  @param {ObjectCallbackArgs} args
 *  @param {...*}         rest
 *  @returns {* | Promise<*>}
 */

/**
 *  @typedef {object} Settings
 *  @property {boolean} [copy]        - Defaults to true. Only false disables result creation; callbacks still run and walk resolves undefined.
 *  @property {boolean} [breadcrumbs] - Defaults to true. Only false disables breadcrumbs preparation.
 *  @property {boolean} [parentPath]  - Defaults to true. Only false disables parent-path preparation.
 *  @property {boolean} [detectCycles] - Defaults to true. Only false disables circular-reference checks and their bookkeeping; visited data and replacements must then be acyclic or callbacks must prune cyclic branches.
 */

/**
 *  @typedef {object} Options
 *  @property {*}             data           - Required. Any JS data structure that will be walked.
 *  @property {KeyCallback}    [keyCallback]    - Optional. Executed on each primitive property.
 *  @property {ObjectCallback} [objectCallback] - Optional. Executed on each object/array property, including the root.
 *  @property {number}         [timeout] - Optional milliseconds. Reject the walk with pending-callback diagnostics when time expires.
 *  @property {Settings}       [settings]       - Optional. Disable copying, unused callback metadata, or cycle detection with false.
 */


/**
 *  Walk-async
 *
 *  Walks through a deep JavaScript data structure, building a copy by default.
 *  Two optional callbacks can mask, filter, substitute, or collect values.
 *  Callback results are awaited in traversal order; thrown errors and rejected promises reject the walk.
 *  Set settings.copy to false to walk without building a result.
 *  By default, circular references point to the ancestor copy without visiting its contents again.
 *
 *  @function walk
 *  @param {Options} options   - Required. Object with `data`, optional callbacks, and optional `settings`.
 *  @param {...*}    args      - Optional. Additional arguments forwarded to both callbacks.
 *  @returns {Promise<*>}      - Resolves to the created result, or undefined when settings.copy is false.
 *  @example
 *  let result = await walk ({
 *      data: someData,
 *      keyCallback:    keyCallbackFn,
 *      objectCallback: objectCallbackFn
 *  })
 *
 *  // Note: objectCallback is executed before keyCallback.
 *  // If you modify an object with objectCallback, keyCallback will be
 *  // executed on the result of objectCallback.
 */
async function walk (options,...args) {
    const pending = new Set ();
    const task = traverse ( options, pending, ...args );
    if ( options.timeout == null )   return task

    let timer;
    const guard = new Promise ( ( resolve, reject ) => {
            timer = setTimeout ( () => {
                    const stuck = [...pending].map ( name => `\n  - ${name}` ).join ( '' );
                    reject ( new Error ( `walk-async: timed out after ${options.timeout}ms; callbacks still pending:${stuck}` ) )
                }, options.timeout )
        })
    try {
            return await Promise.race ([ task, guard ])
        }
    finally {
            clearTimeout ( timer )
        }
} // walk func.



async function traverse ( options, pending, ...args ) {
    let
          { data:origin, keyCallback, objectCallback, settings:config } = options
        , type = findType ( origin )
        , result
        , extend = []
        , ancestors
        , parent
        , hasCallbacks = !!( keyCallback || objectCallback )
        , settings = {
                          copy         : config?.copy !== false
                        , breadcrumbs  : hasCallbacks && config?.breadcrumbs !== false
                        , parentPath   : hasCallbacks && config?.parentPath !== false
                        , detectCycles : config?.detectCycles !== false
                    }
        , breadcrumbs = settings.breadcrumbs ? 'root' : undefined
        , parentPath = settings.parentPath && type !== 'simple' ? Object.freeze ([ 'root' ]) : undefined
        , pass = false
        , control = { finished:false, isFinished:false, restart:false }
        , cb = [ keyCallback, objectCallback ]
        ;

    if ( type !== 'simple' && objectCallback ) {   // Root object callback. Executed before the result is allocated, so it can replace the root with anything.
            const rootParent = settings.parentPath ? Object.freeze ( [] ) : undefined
            const callbackArgs = createCallbackArgs ( origin, 'root', IGNORE, breadcrumbs, rootParent, settings )
            callbackArgs.PASS = PASS
            const replacement = await runCallback ( objectCallback, callbackArgs, pending, 'objectCallback', ...args )
            if ( isFinish ( replacement ) ) {
                    if ( !replacement.hasValue ) {
                            if ( !settings.copy )   return
                            return ( type === 'array' ) ? [] : {}
                        }
                    if ( !keyCallback )   return settings.copy ? replacement.value : undefined
                    control.isFinished = true
                    origin = replacement.value
                }
            else if ( isIgnore ( replacement ) ) {
                    if ( !settings.copy )   return
                    return ( type === 'array' ) ? [] : {}
                }
            else if ( isPass ( replacement ) ) {
                    pass = true
                    if ( replacement.hasValue )   origin = replacement.value
                }
            else    origin = replacement
            type = findType ( origin )
        }

    switch ( type ) {
            case 'array'  :
                                result = settings.copy ? [] : undefined
                                parent = await copyObject ( origin, result, extend, cb, breadcrumbs, settings, control, parentPath, pass, undefined, ancestors, pending, ...args )
                                break
            case 'object' :
                                result = settings.copy ? {} : undefined
                                parent = await copyObject ( origin, result, extend, cb, breadcrumbs, settings, control, parentPath, pass, undefined, ancestors, pending, ...args )
                                break
            case 'simple' :
                                return settings.copy ? origin : undefined
        } // switch type

    for ( let index = 0; index < extend.length && !control.finished; ) {
            const job = extend[index];
            extend[index] = undefined
            control.restart = false
            if ( settings.detectCycles )   ancestors = moveParents ( parent, job.parent, ancestors )
            const path = settings.parentPath ? Object.freeze ([ ...job.parentPath, job.key ]) : undefined;
            parent = await copyObject ( job.data, job.location, extend, cb, job.breadcrumbs, settings, control, path, job.pass, job.parent, ancestors, pending, ...args )
            index = control.restart ? 0 : index + 1
        }
    return result
} // traverse func.



function moveParents ( current, target, ancestors ) {
    // Shallow branches need only a short parent-chain scan. Queue order
    // moves through increasing depths, so the lookup is built once.
    if ( !ancestors ) {
            if ( target.depth < 32 )   return
            ancestors = new WeakMap()
            for ( let parent = target; parent; parent = parent.parent ) {
                    ancestors.set ( parent.data, parent )
                }
            return ancestors
        }

    const pending = [];

    // Keep only the target branch's ancestors in the lookup. Both chains
    // share the root, so they meet before either chain runs out.
    while ( current !== target ) {
            if ( current.depth >= target.depth ) {
                    ancestors.delete ( current.data )
                    current = current.parent
                }
            else {
                    pending.push ( target )
                    target = target.parent
                }
        }

    for ( let index = pending.length - 1; index >= 0; index-- ) {
            const parent = pending[index];
            ancestors.set ( parent.data, parent )
        }
    return ancestors
} // moveParents func.



export default walk

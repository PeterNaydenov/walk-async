export type Resolve = (value: any) => void;
export type Reject = (reason?: any) => void;
export type IgnoreToken = symbol;
export type IgnoreFunction = () => IgnoreToken;
export type PassFunction = (value?: any) => import('./pass.js').PassInstruction;
export type FinishFunction = (value?: any) => import('./finish.js').FinishInstruction;
export type CallbackArgs = {
    /**
     * - The current value being processed.
     */
    value: any;
    /**
     * - Property key as a string.
     */
    key: string;
    /**
     * - Slash-delimited path including the current key. Absent when `settings.breadcrumbs` is false.
     */
    breadcrumbs?: string;
    /**
     * - Read-only path to the parent, excluding the current key. Absent when `settings.parentPath` is false.
     */
    parentPath?: ReadonlyArray<string>;
    /**
     * - Reading this field opts into explicit settlement with resolve(value) or reject().
     */
    resolve: Resolve;
    /**
     * - Drop the current key or branch; does not reject the walk promise.
     */
    reject: Reject;
    /**
     * - Return FINISH() to omit the current value and stop, or FINISH(value) to include a final value or branch.
     */
    FINISH: FinishFunction;
    /**
     * - Return IGNORE() from the callback to drop the current key from the result.
     */
    IGNORE: IgnoreFunction;
};
export type KeyCallbackArgs = CallbackArgs & {
    isFinished: boolean;
};
export type ObjectCallbackArgs = CallbackArgs & {
    PASS: PassFunction;
};
export type KeyCallback = (args: KeyCallbackArgs, ...rest: any) => any | Promise<any>;
export type ObjectCallback = (args: ObjectCallbackArgs, ...rest: any) => any | Promise<any>;
export type Settings = {
    /**
     * - Defaults to true. Only false disables result creation; callbacks still run and walk resolves undefined.
     */
    copy?: boolean;
    /**
     * - Defaults to true. Only false disables breadcrumbs preparation.
     */
    breadcrumbs?: boolean;
    /**
     * - Defaults to true. Only false disables parent-path preparation.
     */
    parentPath?: boolean;
    /**
     * - Defaults to true. Only false disables circular-reference checks and their bookkeeping; visited data and replacements must then be acyclic or callbacks must prune cyclic branches.
     */
    detectCycles?: boolean;
};
export type Options = {
    /**
     * - Required. Any JS data structure that will be walked.
     */
    data: any;
    /**
     * - Optional. Executed on each primitive property.
     */
    keyCallback?: KeyCallback;
    /**
     * - Optional. Executed on each object/array property, including the root.
     */
    objectCallback?: ObjectCallback;
    /**
     * - Optional milliseconds. Reject the walk with pending-callback diagnostics when time expires.
     */
    timeout?: number;
    /**
     * - Optional. Disable copying, unused callback metadata, or cycle detection with false.
     */
    settings?: Settings;
};
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
declare function walk(options: Options, ...args: any[]): Promise<any>;
export default walk;
//# sourceMappingURL=main.d.ts.map
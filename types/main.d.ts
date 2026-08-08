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
export type Resolve = (value: any) => void;
export type Reject = (reason?: any) => void;
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
     * - Slash-delimited path to the current key, starting with `root` (e.g. `"root/props/age"`).
     */
    breadcrumbs: string;
    /**
     * - Resolve the callback with the new value (see `Resolve` typedef).
     */
    resolve: Resolve;
    /**
     * - Reject the callback to drop the current key (see `Reject` typedef).
     */
    reject: Reject;
};
export type KeyCallback = (args: CallbackArgs, ...rest: any) => void;
export type ObjectCallback = (args: CallbackArgs, ...rest: any) => void;
export type Options = {
    /**
     * - Required. Any JS data structure that will be copied.
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
     * - Optional. Milliseconds. When set, the promise is rejected if callbacks do not resolve in time. Error lists the pending callbacks.
     */
    timeout?: number;
};
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
declare function walk({ data: origin, objectCallback, keyCallback, timeout }: Options, ...args: any[]): Promise<any>;
export default walk;
//# sourceMappingURL=main.d.ts.map
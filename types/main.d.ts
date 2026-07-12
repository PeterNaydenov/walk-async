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
export type Options = {
    /**
     * - The data structure to be copied.
     */
    data: Object;
    /**
     * - A function called for every object in the data structure.
     */
    objectCallback: Function | null;
    /**
     * - A function called for every property in the data structure.
     */
    keyCallback: Function | null;
    /**
     * - Milliseconds. When set, the promise is rejected if callbacks do not resolve in time. Error lists the pending callbacks.
     */
    timeout?: number | null;
};
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
declare function walk({ data: origin, objectCallback, keyCallback, timeout }: Options, ...args: any[]): Promise<any>;
export default walk;
//# sourceMappingURL=main.d.ts.map
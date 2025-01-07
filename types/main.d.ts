export default walk;
export type Options = {
    /**
     * - The data structure to be copied.
     */
    data: any;
    /**
     * - A function called for every object in the data structure.
     */
    objectCallback: Function | null;
    /**
     * - A function called for every property in the data structure.
     */
    keyCallback: Function | null;
};
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
declare function walk({ data: origin, objectCallback, keyCallback }: Options, ...args: any[]): Promise<any>;
//# sourceMappingURL=main.d.ts.map
# Release History



### 6.0.0 (2026-08-08)
- [x] Allign version numbers with `@peter.naydenov/walk`. We jumping from 3.1.3 to 6.0.0;
- [x] Types: Tighten callback signatures in `types/main.d.ts`. `keyCallback` and `objectCallback` are now typed as `KeyCallback` / `ObjectCallback` over a `CallbackArgs` shape (`value`, `key`, `breadcrumbs`, `resolve`, `reject`); `resolve` and `reject` are exported as `Resolve` / `Reject` types so TypeScript users get autocomplete. Driven from JSDoc in `src/main.js`; regenerate with `npm run build`;
- [x] Docs: Reframe the lead paragraph so the deep copy reads as a side-effect and the callback-driven modifications as the headline;
- [x] Docs: Add a "When to use `walk-async` vs `structuredClone`" callout that points to the sync sibling `@peter.naydenov/walk` for the no-async case;
- [x] Docs: Add a "Built-in types" subsection that documents how `Date`, `RegExp`, `Map`, `Set`, `WeakMap`, `WeakSet`, `ArrayBuffer`, `DataView`, typed arrays, DOM nodes, and functions are passed by reference;
- [x] Docs: Tighten the `objectCallback` section to enumerate the three return-value outcomes (resolve with object/array, resolve with primitive, `reject()`);
- [x] Docs: Rewrite the "keyCallback" section with the three-outcome return contract, replacing the misleading "value: Only primitives" comment;
- [x] Docs: Add a "Skip a branch" subsection that documents calling `reject()` from `objectCallback` to drop an entire subtree;
- [x] Docs: Reframe the `keyCallback` intro so "forEach" is the central concept, not a secondary use case;
- [x] Docs: Add a "Why one callback, not a list of methods" section that explains the single-pass architecture (matters more for async — extra passes multiply awaited I/O cost) and points users toward callback factories;
- [x] Docs: Add an "Order of execution" section that makes the key invariants visible up front (level-internal key order, deferred nested walks, `objectCallback` before `keyCallback`, root behavior, concurrent key starts);
- [x] Docs: Add a "Migrating from `@peter.naydenov/walk`" section with a side-by-side mapping table (`return value` → `resolve(value)`, `return IGNORE` → `reject()`, etc.) so the sync→async move is mechanical;
- [x] Docs: Align the section ordering with `@peter.naydenov/walk` (Order of execution → callbacks → Why one callback → Installation → How to use it → Migrating → Timeout → Limitations → See also);
- [x] Docs: Add a "See also" block that explicitly positions `walk-async` next to its sync sibling;
- [x] Tests: Add 9 tests in `test/02-keyCallback.test.js` covering plain-object resolution, array resolution, `Date` / `Map` passed by reference, `reject()` drops, order preservation, primitive leaf, and full nested walk with arrays;



## 3.1.3 (2026-07-31)
- [x] Dependencies updates. Ask-for-promise to version 3.2.0;



### 3.1.2 (2026-07-19)
- [x] Fix: built-in object types whose data lives outside the own-enumerable-string-key model (`Date`, `RegExp`, `Map`, `Set`, `WeakMap`, `WeakSet`, `ArrayBuffer`, `DataView`, and all `TypedArray` subclasses) used to be classified as a plain `object` by `findType` and ended up as an empty `{}` in the result. They are now classified as `simple` and preserved by reference, matching the contract already used for `function` values and DOM nodes. Note: this changes the observable shape of the result when a property holds one of these types — the value is now the same reference as the input, not a plain-object copy;
- [x] Fix: the per-key `finishWithCallbacks` task (and, for the `objectCallback` path, the `keyCallbackTask`) was left unresolved when a callback called `reject()` to skip the key. The walk still completed because the outer `executeCallback` was signalled, but the internal tasks lingered. Both now resolve on the `IGNORE` paths so nothing leaks. Note: behavior of the walk itself is unchanged — these are the same outcomes, just with a clean chain;



### 3.1.1 (2026-07-12)
- [x] Moving to typescript v.7.x.x;
- [x] Changing 'mocha' testing library with vitest;
- [x] Converting all tests to vitest;
- [x] Changing coverage library from c8 to @vitest/coverage-v8;



### 3.1.0 (2026-07-07)
- [x] New option 'timeout'. Milliseconds. When set, the walk promise is rejected if callbacks do not resolve in time. Error message lists the breadcrumbs of the pending callbacks;



### 3.0.7 (2026-07-07)
- [x] Fix: 'objectCallback' resolving the root object with a primitive value was crashing on null/undefined or producing broken results;
- [x] Fix: Own '__proto__' property was replacing the prototype of the copy instead of being copied as a regular property;



### 3.0.6 (2026-07-07)
- [x] Fix: Top-level property named 'root' was flattened into the result or dropped;



### 3.0.5 (2026-05-05)
- [x] Dependencies updates. Ask-for-promise to version 3.1.1;



### 3.0.4 (2025-10-28)
- [x] Dependencies updates. Ask-for-promise to version 3.1.0;



### 3.0.3 (2025-10-12)
- [x] Dependencies updates. Ask-for-promise to version 3.0.2;



### 3.0.2 (2025-01-07)
- [x] JSDoc was added to the project;
- [x] Generatated typescript definitions;



### 3.0.1 ( 2024-12-18)
- [x] Dependencies updates. Ask-for-promise to version 3.0.1;



### 3.0.0 ( 2024-12-04)
- [x] Object callback will be triggered on 'root' object as well;




### 2.0.2 ( 2024-01-31)
 - [x] Dev dependencies updates. Chai to version 5.0.3;
 - [x] Dev dependencies updates. C8 to version 9.1.0;
 - [x] Folder 'dist' was added to the project. Includes commonjs, umd and esm versions of the library;
 - [x] Package.json: "exports" section was added. Allows you to use package as commonjs or es6 module without additional configuration;
 - [x] Rollup was added to the project. Used to build the library versions;



### 2.0.0 ( 2024-01-01)
- [x] Module converted to ES module;
- [x] Dev dependencies updates;



### 1.3.1 ( 2023-10-25)
- [x] Dependencies update. Ask-for-promise version 1.4.0;



### 1.3.0 ( 2023-09-23)
- [x] Provide collection containers to callbacks. Extract data during iteration;
- [x] Fix: Keys with value 'undefined' are not being copied;



### 1.2.0 ( 2023-09-18)
- [x] HTML DOM nodes - copy by reference; 
- [ ] Bug: Keys with value 'undefined' are not being copied;



### 1.1.0 ( 2022-11-23)
- [x] Resolving with `Null` and `undefined` from callback functions will be treated as value;



### 1.0.1 ( 2022-09-19)
- [x] Fix: Deep copy process is losing object properties that are equal to 'null';



### 1.0.1 ( 2022-09-19)
- [x] Fix: Deep copy is not working.
- [ ] Bug: Deep copy process is losing object properties that are equal to 'null';



### 1.0.0 (2022-09-18)
 - [x] Initial code;
 - [x] Test package;
 - [x] Documentation;
 - [ ] Bug: Deep copy is not working.



# Release History


### 7.0.0 (2026-10-05)
- [x] Docs: Update the skill;
- [x] Feature: Added private `FINISH()` / `FINISH(value)` instructions to both callbacks. Omit and stop immediately without an argument; key callbacks include supplied values directly, while object callbacks select the final branch for key callbacks with `isFinished:true` and suppress further object callbacks. Promised payloads and explicit settlement are awaited; ordinary key callbacks receive `isFinished:false`;
- [x] Tests: Ported 73 FINISH cases and 832 deterministic generated tests, covering 768 transformation settings cases and 384 early-finish combinations against an independent recursive reference. Added async FINISH settlement, payload, failure, timeout, distribution, and documentation checks;
- [x] Benchmarks: Added fresh-process async memory measurements separating sampled extra heap, retained and released heap after GC, and process RSS high-water marks. Recorded actual async samples and methodology; excluded benchmarks from package contents;
- [x] Docs: Added FINISH semantics, generated test methodology, measured memory use, and historical timing provenance. Updated the helper skill and regenerated FINISH declarations and distributions;
- [x] Feature: Callbacks now accept ordinary returns and awaited promises, matching the synchronous API. Added callable `IGNORE()` to both callbacks; change synchronous `return IGNORE` examples to `return IGNORE()`. Existing async `resolve`/`reject` callbacks remain supported; reading either field selects explicit settlement;
- [x] Feature: Added optional `settings`. Callback arguments `breadcrumbs` and `parentPath` are enabled by default; only literal `false` disables their preparation. Walks without callbacks skip path preparation automatically;
- [x] Feature: Added `settings.copy:false` to walk without building a result. Callback order, paths, replacements, `IGNORE()`, and `PASS()` keep their traversal behaviour; the walk resolves `undefined`;
- [x] Feature: Added read-only `parentPath` arrays to both callbacks. Paths exclude the current key, preserve property boundaries, and use input array indexes;
- [x] Feature: Added the `PASS` function to `objectCallback`. Return `PASS()` to copy the current value, or `PASS(modifiedValue)` to use a replacement, without immediate key callbacks. Replacement promises are awaited. Nested objects and arrays resume normal callbacks; `IGNORE()` removes the entire branch;
- [x] Packaging: Added `"types":"./types/main.d.ts"` before runtime conditions in `exports["."]` so modern TypeScript consumers resolve declarations through package-name imports;
- [x] Fix: Read each property once before finding its type, so getters are not executed twice;
- [x] Fix: Recognize arrays across JavaScript contexts and preserve numeric-looking non-index properties under their original names;
- [x] Breaking: Callback execution now awaits each sibling in `Object.keys` order instead of starting siblings concurrently. Deferred container contents remain in scheduling order;
- [x] Fix: Thrown callback errors, rejected callback promises, rejected resolve values, and nested-walk failures propagate to the walk promise. Awaited finite nested walks have independent state;
- [x] Feature: Retained timeout diagnostics for explicit settlement and unresolved returned promises; timers are cleared on completion or failure;
- [x] Performance: Replaced one-use generator wrappers with a work queue. Processed entries are cleared to release container and path references earlier; callback order is preserved;
- [x] Cleanup: Native promises replace the runtime use of `ask-for-promise`; the declared dependency remains unchanged for the maintainer. Split source helpers to match the synchronous project and regenerated all three distributions and declarations; removed stale `types/src` output;
- [x] Fix: Detect circular references through the current branch's ancestors and link them to the matching ancestor copy. Without copying, stop at the circular edge. Callbacks can still ignore or replace the edge; shared containers on separate branches are copied independently;
- [x] Feature: Added `settings.detectCycles`, enabled by default. Only literal `false` skips circular-reference checks and all ancestor bookkeeping. Visited data and callback replacements must then have no circles, or callbacks must prune cyclic branches;
- [x] Docs: Rewrote the README around readable traversal rules, transformations during copying, deep forEach, branch control, paths, and reference behaviour. Updated the skill and removed the outdated restriction on finite nested walk calls;
- [x] Tests: Ported all 208 synchronous tests, retained all 66 existing async tests, and added awaited instruction, callback order, rejection, and nested-walk tests. Enforced 100% coverage thresholds;
- [x] Tests: Added regression coverage for settings, parent paths, local `PASS`, traversal without copying, circular references, getters, and array recognition and properties;
- [x] Verification: Added generated-format smoke checks, executable README examples, strict TypeScript consumption checks, and a repeatable benchmark for cycle detection, copying, and paths. Recorded actual async measurements without importing synchronous timing claims;



### 6.1.0 (2026-09-01)
- [x] Feature: Added a skill at `.agents/skills/git-walk-async/SKILL.md`;
- [x] Packaging: Added `.agents/skills` to the `"files"` allow-list in `package.json` so the skill ships with the npm package. AI-agent users can discover the walk-async skill from `node_modules` directly, without needing access to the source repo. The same allow-list also drops the dev-only `rollup.config.js`, `tsconfig.json`, and `vitest.config.js` that were leaking under the previous `.npmignore`-only packaging;
- [x] Docs: Prefilled `Migration.guide.md` for every major release: sync-`@peter.naydenov/walk` → `walk-async` (the README's "Migrating from `@peter.naydenov/walk`" table, folded in), v3.x → v6.x (callback signatures tightened with exported `Resolve` / `Reject` typedefs), v3.0.x → v3.1.x (the `timeout` option, the built-in-type pass-by-reference fix from v3.1.2, and the v3.0.6/v3.0.7 root-callback bug fixes), the existing v2.x → v3.x root-callback entry, v1.x → v2.x (ES module + `dist` + `exports`), and v1.0.0 → v1.x (the early null/undefined, DOM-node, and collection-container fixes);



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

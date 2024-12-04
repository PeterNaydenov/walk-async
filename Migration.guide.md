# Migration Guides



## From v.2.x.x - v.3.x.x
Difference between v.2.x.x and v.3.x.x is that object callbacks are triggered on 'root' object as well. So if you have object callbacks that are not working as expected after upgrade, you need to add extra line of code for version 3.

```js
// version 2
function oCallbackFn ({ value:o, key, IGNORE }) {
                          // Some code
                      }

// version 3
function oCallbackFn ({ value:o, key, IGNORE, breadcrumbs }) {
                          if ( breadcrumbs === 'root' ) return o   // Extra line of code for version 3
                          // Some code
                      }
```

Everything else works the same.



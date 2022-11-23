# Walk-async (@peter.naydenov/walk-async)

Creates an immutable copies of javascript data structures(objects, arrays or mixed). Can execute callback functions on every object property(objectCallback) and/or every primitive property(keyCallback). Callbacks can modify result object during the walk process. Mask, filter or substitute values during the copy process. 

```js

  walk ({
            data             // (required) Any JS object structure
          , objectCallback   // (optional) Function executed on each object property
          , keyCallback      // (optional) Function executed on each primitive property
      })
    .then ( result => {
                              // Result will become a exact deep copy of "data" 
                              // - if callbacks are not defined
                              // - if callbacks are resolved with "value" without modification
      })
```

It is very simular to [`@peter.naydenov/walk`](https://github.com/PeterNaydenov/walk) but there are some differences:
 - `walk-async` returns a result as a promise;
 - `walk-async` can execute async operations inside callback methods;
 - `walk-async` keyCallback can return as a result object, array or primitives. 
 - `walk` keyCallback can return only primitives;
 - `walk` can not execute another walk call inside callback functions;


 Data structure values must be one of the following data types:
 - string;
 - number;
 - bigint;
 - boolean;
 - symbol;
 - null;
 - undefined;
 - array;
 - object(data only);
 - function;

 Other data types can compromise the results;



## кeyCallback
Function **keyCallback**  of the `walk-async` could be used also as a deep '**forEach**' method no matter of the type of the object(objects, array or mixed).

```js
function keyCallbackFn ({ value, key, breadcrumbs, resolve, reject }) {
    // value: value of the property. Only primitives;
    // key:  key of the property;
    // breadcrumbs: location of the property;
    // resolve: function that will resolve the callback promise. Provide the result as argument;
    // reject: function that can cancel the copy of that property;
    // Important: key callback should be resolved or rejected. 
  }

const result = await walk ({ data, keyCallback : keyCallbackFn });  // It's the short way to provide only key-callback. Callback functions are optional.
// walk ({ data, keyCallback, objectCallback });  // If both callbacks are available
```


## Object-callback

Optional callback function that is started on each object property. Function should resolve or reject. Rejection of the property will remove it from the result.

```js
function objectCallbackFn ({ value, key, breadcrumbs, resolve, reject }) {
      // value: each object property during the walk;
      // key: key of the object property;
      // breadcrumbs: location of the object;
      // resolve: function that will resolve the callback promise. Provide the result as argument;
      // reject: function that can cancel the copy of that property;
      // Important: Object callback should be resolved or rejected. 
}

walk ({ 
          data
        , keyCallback: keyCallbackFn
        , objectCallback : objectCallbackFn 
    })
  .then ( resultOfWalk => {
            // do something with the result of walk
      })
```

**IMPORTANT: Object-callbacks are executed always before key-callbacks. If we have both callbacks, then key-callbacks will be executed on the result of object-callback.**

Skip key-callbacks by not providing a keyCallback function.
```js
 let result = await walk ({ data })   // ignore key-callbacks
```


## Installation

Install for node.js projects by writing in your terminal:

```
npm install @peter.naydenov/walk-async
```

Once it has been installed, it can be used by writing this line of JavaScript:
```js
let walk = require ( '@peter.naydenov/walk-async' )
```

or

```js
import walk from '@peter.naydenov/walk-async'
```

**Installation for browsers**: Get the file `"dist/walk-async.min.js"` and put it inside the project. Request the file from HTML page. Global variable 'walk' is available for use.

        Note:
        Library is using 'generator functions'. If support for old browsers 
        is required, add a polyfill for 'generators'.





## How to use it

### Deep copy
```js
const myCopy = await walk ({ data:x })   // where x is some javascript data structure
```



### Deep 'forEach'
```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 47
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };

function keyFn ({value,key, breadcrumbs, resolve}) {
              console.log (`${key} ----> ${value}`)   // Show each each primitive couples key->value
              console.log ( `Property location >> ${breadcrumbs}`)
              // example for breadcrumbs: 'age' will looks like this : 'root/props/age'
              resolve ( value )
    }

walk ({ data:x, keyCallback: keyFn })
    .then ( result => {
                    // result is a deep copy of x
          })
```


### Ignore a key

```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 47
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };
function keyFn ({value,key,resolve,reject}) {
        if ( key === 'name' )   reject ()
        else                    resolve ( value )
}

walk ({
            data : x
          , keyCallback : keyFn
      })
  .then ( result => {
              // result will copy all properties from x without the property 'name'.
              // result.name === undefined
      })
```


### Mask values

```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 47
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };
walk ({ 
          data:x
        , keyCallback : ({resolve}) => resolve('xxx') 
    })
  .then ( result => {
          // 'result' will have the same structure as 'x' but all values are 'xxx'
          // {
          //      ls    : [ 'xxx','xxx','xxx' ]
          //    , name  : 'xxx'
          //    , props : {
          //                  eyeColor: 'xxx'
          //                , age     : 'xxx'
          //                , height  : 'xxx'
          //                , sizes : ['xxx','xxx','xxx','xxx']
          //             }
          //   } 
    })
```

### Change object on condition

```js
let x = {
          ls    : [ 1,2,3 ]
        , name  : 'Peter'
        , props : {
                      eyeColor: 'blue'
                    , age     : 48
                    , height  : 176
                    , sizes : [12,33,12,21]
                }
    };

function objectCallback ({ value:obj, key, resolve }) {
    const {age, height} = obj;
    if ( age && age > 30 ) {
            resolve ({ age, height })
            return
        }
    resolve ( obj )
}

walk ({ 
          data: x
        , objectCallback 
      })
    .then ( result => {
            // 'result.props' will have only 'age' and 'height' properties.
            // {
            //      ls    : [ 1,2,3 ]
            //    , name  : 'Peter'
            //    , props : {
            //                  age     : 48
            //                , height  : 176
            //             }
            //   } 
      })
```



## Links
- [Release history](Changelog.md)

## Credits
'@peter.naydenov/walk-async' was created and supported by Peter Naydenov.

## License
'@peter.naydenov/walk-async' is released under the MIT License.

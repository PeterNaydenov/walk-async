"use strict"

import walk from '../src/main.js'



describe ( 'Walk-async -> keyCallback function', () => {

    it ( 'Hide a property', async () => {
                let
                    x = {
                              ls   : [ 1,2,3 ]
                            , name : 'Peter'
                            , props : {
                                          eyeColor: 'blue'
                                        , age     : 47
                                        , height  : 176
                                        , sizes : [12,33,12,21]
                                    }
                            }
                  ;
                const r = await walk ({
                          data : x
                        , keyCallback : ({
                                            key : k
                                          , value
                                          , resolve
                                          , reject
                                        }) => {
                                              if ( k === 'name' )   reject ()
                                              else                  resolve ( value )
                                        }
                        });
                expect ( r ).not.toHaveProperty ( 'name' )
       })  // it Hide a property



    it ( 'Provide a structure. Hide values approaches', async () => {
                let
                    x = {
                              ls   : [ 1,2,3 ]
                            , name : 'Peter'
                            , props : {
                                          eyeColor: 'blue'
                                        , age     : 47
                                        , height  : 176
                                        , sizes : [12,33,12,21]
                                    }
                            };
                const r = await walk ({
                          data:x
                        , keyCallback : ({ resolve, reject, breadcrumbs }) => {
                                              const hasSizes = breadcrumbs.includes('root/props/sizes');
                                              if ( hasSizes )   reject ()
                                              else              resolve ( 'xxx' )
                                          }
                      });
                expect ( r.name       ).toBe ( 'xxx' )
                expect ( r.props.age  ).toBe ( 'xxx' )
                expect ( r.props.sizes.length ).toBe ( 0 )
      })   // it Provide a structure


      it ( 'No properties. Just structures', async () => {
                  let
                    x = {
                              ls   : [ 1,2,3 ]
                            , name : 'Peter'
                            , props : {
                                          eyeColor: 'blue'
                                        , age     : 47
                                        , height  : 176
                                        , sizes : [12,33,12,21]
                                    }
                            };
                  const r = await walk ({
                             data : x
                           , keyCallback : ({reject}) => reject ()
                        });
                  expect ( r ).toHaveProperty ( 'ls' )
                  expect ( r ).toHaveProperty ( 'props' )
                  expect ( r.props ).toHaveProperty ( 'sizes' )

                  expect ( r       ).not.toHaveProperty ( 'name' )
                  expect ( r.props ).not.toHaveProperty ( 'age' )

                  expect ( r.ls.length ).toBe  ( 0 )
                  expect ( r.props.sizes.length ).toBe ( 0 )
      }) // it No properties


      it ( 'Convert primitive property to object', async () => {
                let
                      x = [ 'peter', 'ivan', 'petkan', 'rosica' ]
                    , data = {
                              "ivan"   : { name: 'Ivan', age: 45, gender: 'male' }
                            , "petkan" : { name: 'Petkan', age: 32, gender: 'male' }
                            , "rosica" : { name: "Rosica", age: 75, gender: 'female'}
                        }
                    ;
                function keyCallback ({ value, resolve, reject }) {
                                const person= data[value];
                                if ( person ) {
                                        if ( person.age > 33 ) resolve ( person )
                                        else                   reject ()
                                        return
                                    }
                                else                 resolve ( value )
                    }
                const r = await walk ({
                              data : x
                            , keyCallback
                        });
                expect ( r.length ).toBe ( 3 )   // ignore 'petkan'
                expect ( r[0] ).toBe ( 'peter' ) // no description for 'peter' available
                expect ( r[1]['name']).toBe ( 'Ivan' )
                expect ( r[2]['name']).toBe ( 'Rosica' )
      }) // it Convert primitive property to object



      it ( 'Properties of the array object', async () => {
                let data = [ 'peter', 'ivan' ];
                data.group = 'work'

                function keyCallback ({value, resolve }) {
                            resolve ( value )
                    }

                const r = await walk ({ data, keyCallback });
                expect ( r.length ).toBe ( 2 )
                expect ( r.group ).toBe ( 'work' )
      }) // it Properties of the array



      it ( 'Set a value to NULL', async () => {
                let
                    x = {
                              ls   : [ 1,2,3 ]
                            , name : 'Peter'
                            , props : {
                                          eyeColor: null   // Use callback and return this exact value
                                        , age     : 47
                                        , height  : 176
                                        , sizes : [12,33,12,21]
                                    }
                            };

                function checkNull ({ value, resolve }) {
                            resolve (value)
                    } // checkNull func.

                const r = await walk ({ data:x, keyCallback:checkNull });
                expect ( r.props.eyeColor ).toBe ( null )
        }) // it set a value to NULL



        it ( 'Set a value to undefined', async () => {
                    let
                        x = {
                                  ls   : [ 1,2,3 ]
                                , name : 'Peter'
                                , props : {
                                              eyeColor: undefined   // Use callback and return this exact value
                                            , age     : 47
                                            , height  : 176
                                            , sizes : [12,33,12,21]
                                        }
                                };

                    function checkNull ({ value, resolve }) {
                                resolve(value)
                        } // checkNull func.

                    const r = await walk ({ data:x, keyCallback:checkNull });
                    expect ( r.props.eyeColor ).toBe ( undefined )
          }) // it Set a value to undefined


        it ( 'Copy a function', async () => {
                    let
                        x = {
                                  ls   : [ 1,2,3 ]
                                , name : 'Peter'
                                , props : {
                                              eyeColor: undefined   // Use callback and return this exact value
                                            , age     : function age () { return 47 }
                                            , height  : 176
                                            , sizes : [12,33,12,21]
                                        }
                                };

                    function checkNull ({ value, resolve }) {
                                resolve ( value )
                        } // checkNull func.

                    const r = await walk ({ data:x, keyCallback:checkNull });
                    expect ( r.props.age() ).toBe ( 47 )
            }) // it Copy a function



        it ( 'Extract collections', async () => {
                    let
                        x = {
                                  ls   : [ 1,2,3 ]
                                , name : 'Peter'
                                , props : {
                                              eyeColor: undefined   // Use callback and return this exact value
                                            , age     : function age () { return 47 }
                                            , height  : 176
                                            , sizes : [12,33,12,21]
                                        }
                                }
                      , fnList = []
                      , propsCollection = {}
                      ;

                    function valueFn ({ key, value, resolve }, fn, p ) {
                                const isFn = (typeof value === 'function');
                                if ( isFn )   fn.push ( value )

                                if ( ['name','eyeColor', 'age'].includes(key) )   p[key] = isFn ? value() : value
                                resolve ( value )
                        } // valueFn func.

                    const r = await walk ({ data:x, keyCallback:valueFn }, fnList, propsCollection );
                    expect ( r.props.age() ).toBe ( 47 )
                    expect ( r.props ).toHaveProperty ( 'eyeColor' )
                    expect ( fnList.length ).toBe ( 1 )

                    expect ( propsCollection ).toHaveProperty ( 'name' )
                    expect ( propsCollection ).toHaveProperty ( 'eyeColor' )
                    expect ( propsCollection ).toHaveProperty ( 'age' )
                    expect ( propsCollection.age ).toBe ( 47 )
            }) // it Copy a function



    // -------------------------------------------------------------------------
    // keyCallback returning a plain object/array:
    // The resolved value is re-typed and, if it's a plain object or array, walk
    // continues into it with the other callback. Built-in types (Date, Map,
    // Set, typed arrays, etc.) are still 'simple' and are stored by reference
    // with no descent.
    // -------------------------------------------------------------------------

    it ( 'keyCallback resolving a plain object is walked into (keyCallback fires on its primitives)', async () => {
                const x = { name: 'Peter', age: 47 }
                const seen = []
                const r = await walk ({
                          data: x
                        , keyCallback: ({ value, key, resolve }) => {
                                              seen.push ( `${key}=${value}` )
                                              if ( key === 'name' )   resolve ({ wrapped: { inner: 'newValue' } })
                                              else                    resolve ( value )
                                          }
                    })
                expect ( r.name ).not.toBe ( 'Peter' )
                expect ( r.name.wrapped.inner ).toBe ( 'newValue' )   // walked into
                expect ( seen ).toContain ( 'inner=newValue' )          // keyCallback fired on the new structure
      }) // it keyCallback resolving a plain object


    it ( 'keyCallback resolving a plain object fires objectCallback on the new structure', async () => {
                const x = { name: 'Peter' }
                const objCbKeys = []
                await walk ({
                          data: x
                        , objectCallback: ({ value, key, resolve }) => {
                                              if ( key !== 'root' )   objCbKeys.push ( key )
                                              resolve ( value )       // pass-through
                                          }
                        , keyCallback: ({ key, value, resolve }) => {
                                              if ( key === 'name' )   resolve ({ wrapped: { inner: 'x' } })
                                              else                    resolve ( value )
                                          }
                    })
                // The substituted structure was walked: objectCallback fired for its object key 'wrapped'
                expect ( objCbKeys ).toContain ( 'wrapped' )
      }) // it keyCallback resolving object + objectCallback


    it ( 'keyCallback resolving an array is walked into', async () => {
                const x = { items: 'placeholder' }
                const r = await walk ({
                          data: x
                        , keyCallback: ({ key, value, resolve }) => key === 'items' ? resolve ([ 1, 2, 3 ]) : resolve ( value )
                    })
                expect ( Array.isArray ( r.items ) ).toBe ( true )
                expect ( r.items ).toEqual ( [ 1, 2, 3 ] )
      }) // it keyCallback resolving an array


    it ( 'keyCallback resolving a built-in (Date) is passed by reference, not walked', async () => {
                const d = new Date ( '2024-01-15' )
                const x = { when: 'placeholder' }
                let objectCbDescents = 0
                const r = await walk ({
                          data: x
                        , objectCallback: ({ value, key, resolve }) => {
                                              if ( key === 'when' )   objectCbDescents++
                                              resolve ( value )
                                          }
                        , keyCallback: ({ key, value, resolve }) => key === 'when' ? resolve (d) : resolve ( value )
                    })
                expect ( r.when ).toBe ( d )             // same reference, not a copy
                expect ( objectCbDescents ).toBe ( 0 )   // objectCallback never fired on the Date
      }) // it keyCallback resolving a Date


    it ( 'keyCallback resolving a Map is passed by reference, not walked', async () => {
                const m = new Map ([ [ 'a', 1 ], [ 'b', 2 ] ])
                const x = { scores: 'placeholder' }
                const r = await walk ({
                          data: x
                        , keyCallback: ({ key, value, resolve }) => key === 'scores' ? resolve (m) : resolve ( value )
                    })
                expect ( r.scores ).toBe ( m )                      // same reference
                expect ( r.scores.get ( 'a' ) ).toBe ( 1 )         // still functional
                expect ( r.scores.get ( 'b' ) ).toBe ( 2 )
      }) // it keyCallback resolving a Map


    it ( 'keyCallback reject drops the key (unchanged behavior)', async () => {
                const x = { name: 'Peter', age: 47 }
                const r = await walk ({
                          data: x
                        , keyCallback: ({ key, value, resolve, reject }) => key === 'age' ? reject () : resolve ( value )
                    })
                expect ( r.name ).toBe ( 'Peter' )
                expect ( r ).not.toHaveProperty ( 'age' )
      }) // it keyCallback reject


    it ( 'keyCallback resolving an object preserves iteration order of the current level (deferred via extend)', async () => {
                // When keyCallback resolves an object for one key, the new walk
                // is deferred via the extend mechanism. The other keys at the same
                // level are still visited in Object.keys order, and the new
                // structure's keys are visited after the level completes.
                const x = { a: 1, b: 'two', c: 3, d: 4 }
                const visitOrder = []
                await walk ({
                          data: x
                        , keyCallback: ({ key, value, resolve }) => {
                                              visitOrder.push ( key )
                                              if ( key === 'b' )   resolve ({ nested: 'object' })
                                              else                resolve ( value )
                                          }
                    })
                // First 4 visits are the level's own keys in Object.keys order
                expect ( visitOrder.slice ( 0, 4 ) ).toEqual ( [ 'a', 'b', 'c', 'd' ] )
                // The substituted structure's key is visited after the level
                expect ( visitOrder ).toContain ( 'nested' )
                expect ( visitOrder.indexOf ( 'nested' ) ).toBeGreaterThan ( visitOrder.indexOf ( 'd' ) )
      }) // it order preservation


    it ( 'keyCallback resolving a primitive still stores it as a leaf (no descent)', async () => {
                const x = { name: 'Peter' }
                let descents = 0
                const r = await walk ({
                          data: x
                        , objectCallback: ({ value, key, resolve }) => {
                                              if ( key === 'name' )   descents++
                                              resolve ( value )
                                          }
                        , keyCallback: ({ key, value, resolve }) => key === 'name' ? resolve ('renamed') : resolve ( value )
                    })
                expect ( r.name ).toBe ( 'renamed' )
                expect ( descents ).toBe ( 0 )   // string is 'simple', no descent
      }) // it keyCallback resolving a primitive


    it ( 'keyCallback resolving a nested object with arrays is fully walked', async () => {
                const x = { config: 'placeholder' }
                const r = await walk ({
                          data: x
                        , keyCallback: ({ key, value, resolve }) => key === 'config'
                                              ? resolve ({ db: { host: 'localhost', ports: [ 5432, 5433 ] } })
                                              : resolve ( value )
                    })
                expect ( r.config.db.host ).toBe ( 'localhost' )
                expect ( r.config.db.ports ).toEqual ( [ 5432, 5433 ] )
                // Walk produced a deep copy, not a reference to the input
                expect ( r.config ).not.toBe ( x.config )
      }) // it keyCallback resolving a nested object with arrays


}) // describe

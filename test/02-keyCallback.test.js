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

}) // describe

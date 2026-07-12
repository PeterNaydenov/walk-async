"use strict"

import walk from '../src/main.js'



describe ( 'Walk-async -> objectCallback function', () => {

      it ( 'Object callback function only', async () => {
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

                function oCallbackFn ({value,resolve}) {
                            const { age, height } = value;
                            if ( age === 47 )   resolve ({ eyeColor:'dark', height })
                            else                resolve ( value )
                      }

                const r = await walk ( {
                            data : x
                          , objectCallback : oCallbackFn
                      });
                expect ( r.props ).not.toHaveProperty ( 'age'   )
                expect ( r.props ).not.toHaveProperty ( 'sizes' )
                expect ( r.props.eyeColor ).toBe ( 'dark'  )
      }) // it object callback



      it ( 'Object callback returns null', async () => {
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

                function oCallbackFn ({ value:o, resolve, reject }) {
                          const { sizes } = o;
                          if ( sizes )   reject ()
                          else           resolve (o)
                      }

                const r = await walk ({
                          data : x
                        , objectCallback : oCallbackFn
                    });
                expect ( r ).not.toHaveProperty ( 'props' )
      }) // it object callback null



      it ( 'Object callback returns a string', async () => {
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

                function oCallbackFn ({ value:o, resolve }) {
                          const { sizes } = o;
                          if ( sizes )   resolve ( 'list' )
                          else           resolve ( o )
                      }

                const r = await walk ({
                          data: x
                        , objectCallback : oCallbackFn
                      });
                expect ( r ).toHaveProperty ( 'props' )
                expect ( r.props ).toBe ( 'list' )
      }) // it object callback null



      it ( 'Object callback changes the data', async () => {
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

                function oCallbackFn ({ value:o, resolve }) {
                          const { sizes } = o;
                          if ( sizes )    o.sizes = [ 'list of sizes' ]
                          resolve ( o )
                      }

                const r = await walk ({
                          data : x
                        , objectCallback : oCallbackFn
                    });
                expect ( r ).toHaveProperty ( 'props' )
                expect ( r.props ).toHaveProperty ( 'sizes' )
                expect ( r.props.sizes ).toHaveLength ( 1 )
                expect ( r.props.sizes[0]).toBe ( 'list of sizes' )
      }) // it object callback changes the data



      it ( 'Object callback checks key', async () => {
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

                function oCallbackFn ({ value:o, key, resolve, reject }) {
                          if ( key === 'props' )   reject ()
                          resolve ( o )
                      }

                const r = await walk ({
                          data: x
                        , objectCallback: oCallbackFn
                      });
                expect ( r ).not.toHaveProperty ( 'props' )
      }) // it Object callback checks key



      it ( 'Object callback checks breadcrumbs', async () => {
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

                function oCallbackFn ({ value:o, breadcrumbs, resolve, reject } ) {
                          if ( breadcrumbs === 'root/props' )   reject ()
                          resolve ( o )
                        }

                const r = await walk ({
                            data : x
                          , objectCallback : oCallbackFn
                    });
                expect ( r ).not.toHaveProperty ( 'props' )
        }) // it Object callback checks breadcrumbs



      it ( 'Prevent array empty items', async () => {
                let
                    x = [
                              { id: 1 }
                            , { id: 2 }
                            , { id: 3 }
                            , { id: 5 }
                        ];

                function oCallbackFn ({ key, value:o, resolve, reject }) {
                          if ( key === 'root' )   return resolve ( o )   // keep the root container
                          if ( o.id === 5 )   resolve ( o )
                          reject ()
                      }

                const r = await walk ({
                          data : x
                        , objectCallback : oCallbackFn
                    });
                expect ( r.length ).toBe ( 1 )
      }) // it Prevent array empty items



      it ( 'Prevent array empty items 2', async () => {
                let
                    x = [
                              [1]
                            , [2]
                            , [3]
                            , [5]
                        ];

                function oCallbackFn ({ key, value:o, resolve, reject }) {
                          if ( key === 'root' )   return resolve ( o )   // keep the root container
                          if ( o[0] === 5 )   resolve ( o )
                          reject ()
                      }

                const r = await walk ({
                          data : x
                        , objectCallback : oCallbackFn
                    });
                expect ( r.length ).toBe ( 1 )
                expect ( r[0][0]  ).toBe ( 5 )
          }) // it Prevent array empty items 2



      it ( 'Set a object to NULL', async () => {
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

                  function objToNull ({value,key, resolve }) {
                            if ( key === 'props' )   resolve ( null )
                            else                     resolve (value)
                      } // objToNull func.

                  const r = await walk ({ data:x, objectCallback:objToNull });
                  expect ( r.props ).toBe ( null )
          }) // it Set a object to NULL



      it ( 'Set a object to undefined', async () => {
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

                  function objToNull ({value,key, resolve }) {
                            if ( key === 'props' )   resolve ( undefined )
                            else                     resolve ( value )
                      } // objToNull func.

                  const r = await walk ({ data:x, objectCallback:objToNull });
                  expect ( r.props ).toBe ( undefined )
          }) // it Set a object to undefined



      it ( 'Root object callback', async () => {
                 let hasRoot = false
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

                  function objToNull ({value,key, resolve, breadcrumbs }) {
                            if ( breadcrumbs === 'root' ) {
                                    hasRoot = true
                                    resolve ( value )
                                }
                            if ( key === 'props' )   resolve ( undefined )
                            else                     resolve ( value )
                      } // objToNull func.

                  const r = await walk ({ data:x, objectCallback:objToNull });
                  expect ( r.props ).toBe ( undefined )
                  expect ( hasRoot ).toBe ( true )
          }) // it Root object callback



      it ( 'Object callback replaces root with a string', async () => {
                  const x = { a: 1 };

                  function oCallbackFn ({ resolve, value, key }) {
                            if ( key === 'root' )   return resolve ( 'list' )
                            resolve ( value )
                      }

                  const r = await walk ({ data:x, objectCallback: oCallbackFn });
                  expect ( r ).toBe ( 'list' )
          }) // it Object callback replaces root with a string



      it ( 'Object callback replaces root with null', async () => {
                  const x = { a: 1 };

                  function oCallbackFn ({ resolve, value, key }) {
                            if ( key === 'root' )   return resolve ( null )
                            resolve ( value )
                      }

                  const r = await walk ({ data:x, objectCallback: oCallbackFn });
                  expect ( r ).toBe ( null )
          }) // it Object callback replaces root with null



      it ( 'Object callback rejects root', async () => {
                  const x = { a: 1 };

                  function oCallbackFn ({ resolve, reject, key }) {
                            if ( key === 'root' )   return reject ()
                            resolve ( x )
                      }

                  const r = await walk ({ data:x, objectCallback: oCallbackFn });
                  expect ( r ).toEqual ({})
          }) // it Object callback rejects root



}) // describe

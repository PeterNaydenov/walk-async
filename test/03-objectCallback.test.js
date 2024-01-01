"use strict"

import { expect } from 'chai'
import walk from '../src/main.js'



describe ( 'Walk-async -> objectCallback function', () => {

      it ( 'Object callback function only', () => {
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

                walk ( {
                            data : x
                          , objectCallback : oCallbackFn
                      })
                  .then ( r => {
                            expect ( r.props ).to.not.have.property ( 'age'   )
                            expect ( r.props ).to.not.have.property ( 'sizes' )
                            expect ( r.props.eyeColor ).to.be.equal ( 'dark'  )
                      })
      }) // it object callback


      
      it ( 'Object callback returns null', () => {
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

                walk ({ 
                          data : x
                        , objectCallback : oCallbackFn
                    })
                  .then ( r => {
                        expect ( r ).to.not.have.property ( 'props' )
                    })
      }) // it object callback null



      it ( 'Object callback returns a string', () => {
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

                walk ({
                          data: x
                        , objectCallback : oCallbackFn
                      })
                  .then ( r => {
                          expect ( r ).to.have.property ( 'props' )
                          expect ( r.props ).to.be.equal ( 'list' )
                      })
      }) // it object callback null



      it ( 'Object callback changes the data', () => {
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

                walk ({
                          data : x
                        , objectCallback : oCallbackFn
                    })
                  .then ( r => {
                          expect ( r ).to.have.property ( 'props' )
                          expect ( r.props ).to.have.property ( 'sizes' )
                          expect ( r.props.sizes ).to.have.length ( 1 )
                          expect ( r.props.sizes[0]).to.be.equal ( 'list of sizes' )
                    })
      }) // it object callback changes the data



      it ( 'Object callback checks key', () => {
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

                walk ({ 
                          data: x
                        , objectCallback: oCallbackFn
                      })
                  .then ( r => {
                          expect ( r ).to.not.have.property ( 'props' )
                      })
      }) // it Object callback checks key



      it ( 'Object callback checks breadcrumbs', () => {
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

                walk ({
                            data : x
                          , objectCallback : oCallbackFn
                    })
                  .then ( r => {
                          expect ( r ).to.not.have.property ( 'props' )
                    })
        }) // it Object callback checks breadcrumbs



      it ( 'Prevent array empty items', () => {
                let 
                    x = [
                              { id: 1 }
                            , { id: 2 }
                            , { id: 3 }
                            , { id: 5 }
                        ];

                function oCallbackFn ({ value:o, resolve, reject }) {
                          if ( o.id === 5 )   resolve ( o )
                          reject ()
                      }

                walk ({
                          data : x
                        , objectCallback : oCallbackFn
                    })
                  .then ( r => {
                        expect ( r.length ).to.be.equal ( 1 )
                    })
      }) // it Prevent array empty items



      it ( 'Prevent array empty items 2', () => {
                let 
                    x = [
                              [1]
                            , [2]
                            , [3]
                            , [5]
                        ];

                function oCallbackFn ({ value:o, resolve, reject }) {
                          if ( o[0] === 5 )   resolve ( o )
                          reject ()
                      }

                walk ({
                          data : x
                        , objectCallback : oCallbackFn
                    })
                  .then ( r => {
                          expect ( r.length ).to.be.equal ( 1 )
                          expect ( r[0]     ).to.be.equal ( 5 )
                    })
          }) // it Prevent array empty items 2



      it ( 'Set a object to NULL', done => {
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

                  walk ({ data:x, objectCallback:objToNull })
                      .then ( r => {
                                  expect ( r.props ).to.be.equal ( null )
                                  done ()
                          })
          }) // it Set a object to NULL



      it ( 'Set a object to undefined', done => {
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

                  walk ({ data:x, objectCallback:objToNull })
                    .then ( r => {
                                expect ( r.props ).to.be.equal ( undefined )
                                done ()
                          })
          }) // it Set a object to undefined


      
}) // describe



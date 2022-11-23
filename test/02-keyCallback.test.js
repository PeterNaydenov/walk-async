"use strict"

const
      chai = require ( 'chai' )
    , expect = chai.expect
    , walk = require ( '../src/main.js' )
    ;


describe ( 'Walk-async -> keyCallback function', () => {

    it ( 'Hide a property', () => {
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
                walk ({
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
                        })
                  .then ( r => {
                                        expect ( r ).to.not.have.property ( 'name' )
                        })
       })  // it Hide a property



    it ( 'Provide a structure. Hide values approaches', () => {
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
                walk ({
                          data:x
                        , keyCallback : ({ resolve, reject, breadcrumbs }) => {
                                              const hasSizes = breadcrumbs.includes('root/props/sizes');
                                              if ( hasSizes )   reject ()
                                              else              resolve ( 'xxx' )
                                          }
                      })
                  .then ( r => {
                              expect ( r.name       ).to.be.equal ( 'xxx' )
                              expect ( r.props.age  ).to.be.equal ( 'xxx' )
                              expect ( r.props.sizes.length ).to.be.equal ( 0 )
                        })
      })   // it Provide a structure


      it ( 'No properties. Just structures', () => {
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
                  walk ({
                             data : x
                           , keyCallback : ({reject}) => reject () 
                        })
                    .then ( r => {
                                    expect ( r ).to.have.property ( 'ls' )
                                    expect ( r ).to.have.property ( 'props' )
                                    expect ( r.props ).to.have.property ( 'sizes' )
                  
                                    expect ( r       ).to.not.have.property ( 'name' )
                                    expect ( r.props ).to.not.have.property ( 'age' )
                  
                                    expect ( r.ls.length ).to.be.equal  ( 0 )
                                    expect ( r.props.sizes.length ).to.be.equal ( 0 )
                          })
      }) // it No properties


      it ( 'Convert primitive property to object', () => {
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
                walk ({
                              data : x
                            , keyCallback
                        })
                    .then ( r => {
                            expect ( r.length ).to.be.equal ( 3 )   // ignore 'petkan'
                            expect ( r[0] ).to.be.equal ( 'Peter' ) // no description for Peter available
                            expect ( r[1]['name']).to.be.equal ( 'Ivan' )
                            expect ( r[2]['name']).to.be.equal ( 'Rosica' )
                        })
      }) // it Convert primitive property to object



      it ( 'Properties of the array object', () => {
                let data = [ 'peter', 'ivan' ];
                data.group = 'work'

                function keyCallback ({value, resolve }) {
                            resolve ( value )
                    }

                walk ({ data, keyCallback })
                  .then ( r => {
                                expect ( r.length ).to.be.equal ( 2 )
                                expect ( r.group ).to.be.equal ( 'work' )
                        })
      }) // it Properties of the array



      it ( 'Set a value to NULL', done => {
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

                walk ({ data:x, keyCallback:checkNull })
                    .then ( r => {
                            expect ( r.props.eyeColor ).to.be.equal ( null )
                            done ()
                        })
        }) // it set a value to NULL



        it ( 'Set a value to undefined', done => {
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

                    walk ({ data:x, keyCallback:checkNull })
                      .then ( r => {
                                expect ( r.props.eyeColor ).to.be.equal ( undefined )
                                done ()
                            })
          }) // it Set a value to undefined
        

        it ( 'Copy a function', done => {
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

                    walk ({ data:x, keyCallback:checkNull })
                        .then ( r => {
                                expect ( r.props.age() ).to.be.equal ( 47 )
                                done ()
                            })
            }) // it Copy a function
      
}) // describe



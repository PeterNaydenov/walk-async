"use strict"

const
      chai = require ( 'chai' )
    , expect = chai.expect
    , walk = require ( '../src/main.js' )
    ;


describe ( 'Walk-async -> Both callbacks together', () => {

    it ( 'Modify on object and key callback level', () => {
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
                
                function keysModifier ({value, key, resolve, reject }) {
                                if ( key === 'age')             reject ()  // remove 'age'
                                else if ( key=== 'eyeColor' )   resolve ( 'xxx' ) 
                                else                            resolve ( value )
                        }

                function objectModifier ({value, key, resolve }) {
                                if ( key === 'props' ) {
                                        const { sizes, ... others } = value  // remove 'sizes'
                                        resolve ( others )
                                    }
                                else    resolve ( value )
                        }


                walk ({
                          data : x
                        , keyCallback : keysModifier
                        , objectCallback : objectModifier
                        })
                  .then ( r => {
                                        expect ( r.props ).to.not.have.property ( 'age' )
                                        expect ( r.props ).to.not.have.property ( 'sizes' )
                                        expect ( r.props.eyeColor ).to.be.equal ( 'xxx' )
                        })
       })  // it Modify on object and key callback level

      
}) // describe



"use strict"

import walk from '../src/main.js'



describe ( 'Walk-async -> Both callbacks together', () => {

    it ( 'Modify on object and key callback level', async () => {
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


                const r = await walk ({
                          data : x
                        , keyCallback : keysModifier
                        , objectCallback : objectModifier
                        });
                expect ( r.props ).not.toHaveProperty ( 'age' )
                expect ( r.props ).not.toHaveProperty ( 'sizes' )
                expect ( r.props.eyeColor ).toBe ( 'xxx' )
       })  // it Modify on object and key callback level


}) // describe

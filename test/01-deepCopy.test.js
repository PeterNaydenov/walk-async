"use strict"

import { expect } from 'chai'
import walk from '../src/main.js'



describe ( 'Walk-async -> Deep copy', () => {

    it ( 'Copy a primitive value', () => {
                let x = 12;
                walk ({data:x})
                    .then ( r => {
                                x = 64
                                expect ( r ).to.be.equal ( 12 )
                                expect ( r !== x )
                          })
        }) // it copy a primitives



    it ( 'Copy array of strings', () => {
                let x = [ 'one', 'two', 'three' ];
                walk ({data:x})
                    .then ( r => {
                              x.push ( 'four' )
                              expect ( r ).to.have.length ( 3 )
                        })
        }) // it copy array of strings



    it ( 'Copy a single level deep object', () => {
                let 
                    x = { name:'Peter', age: 47 }
                  , z = x
                  ;                   
                walk ( {data:x})
                    .then ( r => {
                            x.test = 'hello'
                            expect ( r ).to.not.have.property ( 'test' )
                            expect ( z ).to.have.property ( 'test' )
                      })                  
        }) // it copy a single level deep object



    it ( 'Copy a mixed structure', () => {
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
                walk ( x )
                    .then ( r => {
                                r.props.sizes.push ( 66 )
                                x.props.sizes[0] = 222222
                                x.props.test = 'hello'

                                expect ( x.props.sizes ).to.have.length ( 4 )
                                expect ( r.props.sizes ).to.have.length ( 5 )
                                expect ( x.props.sizes[0] !== r.props.sizes[0])
                
                                expect ( r.props ).to.not.have.property ( 'test' )
                          })
        }) // it Copy a mixed structure

    it ( 'Data property has value "null"', done => {
          // Fix: Deep copy process is losing object properties that are equal to 'null'
          const x = { name : null };
          walk ({data:x}).then ( r => {
                    expect ( r ).to.have.property ( 'name' )
                    expect ( r.name ).to.be.equal ( null )
                    done ()
                })
    }) // it Data property has value null



    it ( 'html nodes - copy by reference', done => {
        const data = {
                      name : 'Peter'
                    , pretendHTML : { nodeType: 1 }
                };
        walk ({ data })
            .then ( r => {
                    r.pretendHTML.something = 'hello'
                    expect ( data.pretendHTML.something ).to.be.equal ( 'hello' )   // Recognize html nodes and keep them as a reference
                    done ()
            })
    }) // html nodes - copy by reference



  it ( 'Functions type - copy by reference', () => {
            const data = {
                          name : 'Peter'
                        , func : () => 12
                    };
                    
            walk ({ data })
                .then ( r => {  
                            expect ( r.func() ).to.be.equal ( 12 )
                    })
    }) // it Functions type - copy by reference
  
}) // describe



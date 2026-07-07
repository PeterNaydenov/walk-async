"use strict"

import { expect } from 'chai'
import walk from '../src/main.js'



describe ( 'Walk-async -> Asynchronous tests', () => {

    it ( 'Call walk inside other walk', () => {
                let data = {
                            users : [
                                        {
                                              name: 'Peter'
                                            , friends : ['Tisho', 'Radostin', 'Tony', 'Kalin' ]
                                        }
                                        , {
                                             name: 'Joro'
                                             , friends : [ 'Katya', 'Ivan', 'Stefan', 'Valentin' ]
                                        }
                                    ]
                            }
                    , friendsWithPermition = [ 'Kalin', 'Aleks', 'Tony', 'Ivan' ]
                    ;

                async function filterObj ({value:obj, task, breadcrumbs }) {
                            if ( obj.friends ) {
                                        function filterNames ({value:person, key, breadcrumbs, task:scanning} ) {
                                                                let validated = friendsWithPermition.includes(person)
                                                                if ( validated )    scanning.done ( person )
                                                                else                scanning.done ( null   )
                                            } // filterNames func.
                                        walk ({
                                                      data: obj.friends
                                                    , keyCallback : filterNames
                                                })
                                            .then ( r => {
                                                    obj.friends = r
                                                    task.done ( obj )
                                                })
                                        return
                                }
                            // if ( obj. ) {
                            //             function filterNames ({value:user, key, breadcrumbs, task:scanning} ) {
                            //                                     let valid = friendsWithPermition.includes(user) ;
                            //                                     // if ( valid )   console.log ( user )
                            //                                     if ( valid )   scanning ( user )
                            //                                     else           scanning ( null )
                            //                 } // filterNames func.
                            //            walk ({ 
                            //                       data : obj
                            //                     , keyCallback : filterNames 
                            //                 }).then ( r => {
                            //                     // console.log ( r )
                            //                     task.done ( r )
                            //                 })
                            //             return
                            //     }
                            // console.log ( 'Object callback' )
                            // console.log ( obj )
                            task.done (obj)
                    } // filterObj func.

                // let res = walk ( data, [null, filterObj])
                // console.log ( res.users[0] )
                // console.log (  )
                // walk ( data )
                walk ({
                          data
                        , objectCallback : filterObj 
                        })
                    .then ( x => {
                                console.log ( x.users[0] )
                        })
                // console.log ( x )
                
                    
                
        }) // it call walk inside other walk



    it ( 'Timeout: stuck objectCallback rejects with diagnostics', done => {
                const x = {
                              name : 'Peter'
                            , props : { age: 47 }
                        };

                function oCallbackFn ({ resolve, value, breadcrumbs }) {
                          if ( breadcrumbs === 'root/props' )   return   // never resolves, never rejects
                          resolve ( value )
                    }

                walk ({ data:x, objectCallback: oCallbackFn, timeout: 50 })
                    .then (
                          ()  => done ( new Error ( 'Promise should reject on timeout' ))
                        , err => {
                                  expect ( err ).to.be.an.instanceof ( Error )
                                  expect ( err.message ).to.include ( 'timed out after 50ms' )
                                  expect ( err.message ).to.include ( "objectCallback at 'root/props'" )
                                  done ()
                            })
        }) // it Timeout: stuck objectCallback rejects with diagnostics



    it ( 'Timeout: stuck keyCallback rejects with diagnostics', done => {
                const x = {
                              name : 'Peter'
                            , age  : 47
                        };

                function kCallbackFn ({ resolve, value, key }) {
                          if ( key === 'name' )   return   // never resolves, never rejects
                          resolve ( value )
                    }

                walk ({ data:x, keyCallback: kCallbackFn, timeout: 50 })
                    .then (
                          ()  => done ( new Error ( 'Promise should reject on timeout' ))
                        , err => {
                                  expect ( err.message ).to.include ( "keyCallback at 'root/name'" )
                                  done ()
                            })
        }) // it Timeout: stuck keyCallback rejects with diagnostics



    it ( 'Timeout: resolves normally when callbacks are on time', done => {
                const x = { a: 1, b: { c: 2 } };

                function oCallbackFn ({ resolve, value }) {
                          setTimeout ( () => resolve ( value ), 10 )   // slow but within the limit
                    }

                walk ({ data:x, objectCallback: oCallbackFn, timeout: 200 })
                    .then ( r => {
                                expect ( r ).to.deep.equal ({ a: 1, b: { c: 2 } })
                                done ()
                        })
        }) // it Timeout: resolves normally when callbacks are on time



    it ( 'Timeout: plain deep copy is not affected', done => {
                const x = { a: 1, ls: [ 1, 2, 3 ] };

                walk ({ data:x, timeout: 50 })
                    .then ( r => {
                                expect ( r ).to.deep.equal ({ a: 1, ls: [ 1, 2, 3 ] })
                                done ()
                        })
        }) // it Timeout: plain deep copy is not affected

}) // describe
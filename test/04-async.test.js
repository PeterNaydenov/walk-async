"use strict"

import walk from '../src/main.js'



describe ( 'Walk-async -> Asynchronous tests', () => {

    it ( 'Call walk inside other walk', async () => {
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

                function filterObj ({value:obj, resolve}) {
                            if ( obj.friends ) {
                                        function filterNames ({value:person, resolve, reject}) {
                                                                if ( friendsWithPermition.includes(person) )   resolve ( person )
                                                                else                                           reject ()
                                            } // filterNames func.
                                        walk ({
                                                      data: obj.friends
                                                    , keyCallback : filterNames
                                                })
                                            .then ( r => {
                                                    obj.friends = r
                                                    resolve ( obj )
                                                })
                                        return
                                }
                            resolve ( obj )
                    } // filterObj func.

                const x = await walk ({
                          data
                        , objectCallback : filterObj
                        });

                expect ( x.users ).toHaveLength ( 2 )
                expect ( x.users[0].friends ).toEqual ([ 'Tony', 'Kalin' ])
                expect ( x.users[1].friends ).toEqual ([ 'Ivan' ])
        }) // it call walk inside other walk



    it ( 'Timeout: stuck objectCallback rejects with diagnostics', async () => {
                const x = {
                              name : 'Peter'
                            , props : { age: 47 }
                        };

                function oCallbackFn ({ resolve, value, breadcrumbs }) {
                          if ( breadcrumbs === 'root/props' )   return   // never resolves, never rejects
                          resolve ( value )
                    }

                await expect ( walk ({ data:x, objectCallback: oCallbackFn, timeout: 50 }) )
                    .rejects.toThrow ( /timed out after 50ms.*objectCallback at 'root\/props'/s )
        }) // it Timeout: stuck objectCallback rejects with diagnostics



    it ( 'Timeout: stuck keyCallback rejects with diagnostics', async () => {
                const x = {
                              name : 'Peter'
                            , age  : 47
                        };

                function kCallbackFn ({ resolve, value, key }) {
                          if ( key === 'name' )   return   // never resolves, never rejects
                          resolve ( value )
                    }

                await expect ( walk ({ data:x, keyCallback: kCallbackFn, timeout: 50 }) )
                    .rejects.toThrow ( /keyCallback at 'root\/name'/ )
        }) // it Timeout: stuck keyCallback rejects with diagnostics



    it ( 'Timeout: resolves normally when callbacks are on time', async () => {
                const x = { a: 1, b: { c: 2 } };

                function oCallbackFn ({ resolve, value }) {
                          setTimeout ( () => resolve ( value ), 10 )   // slow but within the limit
                    }

                const r = await walk ({ data:x, objectCallback: oCallbackFn, timeout: 200 });
                expect ( r ).toEqual ({ a: 1, b: { c: 2 } })
        }) // it Timeout: resolves normally when callbacks are on time



    it ( 'Timeout: plain deep copy is not affected', async () => {
                const x = { a: 1, ls: [ 1, 2, 3 ] };

                const r = await walk ({ data:x, timeout: 50 });
                expect ( r ).toEqual ({ a: 1, ls: [ 1, 2, 3 ] })
        }) // it Timeout: plain deep copy is not affected

}) // describe

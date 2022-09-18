"use strict"

const
      chai = require ( 'chai' )
    , expect = chai.expect
    , walk = require ( '../src/main.js' )
    , askForPromise = require ( 'ask-for-promise' )
    ;


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
}) // describe
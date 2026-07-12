"use strict"

import walk from '../src/main.js'



describe ( 'Walk-async -> Deep copy', () => {

    it ( 'Copy a primitive value', async () => {
                let x = 12;
                const r = await walk ({data:x});
                x = 64;
                expect ( r ).toBe ( 12 )
                expect ( r ).not.toBe ( x )
        }) // it copy a primitives



    it ( 'Copy array of strings', async () => {
                let x = [ 'one', 'two', 'three' ];
                const r = await walk ({data:x});
                x.push ( 'four' );
                expect ( r ).toHaveLength ( 3 )
        }) // it copy array of strings



    it ( 'Copy a single level deep object', async () => {
                let
                    x = { name:'Peter', age: 47 }
                  , z = x
                  ;
                const r = await walk ( {data:x});
                x.test = 'hello';
                expect ( r ).not.toHaveProperty ( 'test' )
                expect ( z ).toHaveProperty ( 'test' )
        }) // it copy a single level deep object



    it ( 'Copy a mixed structure', async () => {
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
                const r = await walk ({ data: x });
                r.props.sizes.push ( 66 );
                x.props.sizes[0] = 222222;
                x.props.test = 'hello';

                expect ( x.props.sizes ).toHaveLength ( 4 )
                expect ( r.props.sizes ).toHaveLength ( 5 )
                expect ( x.props.sizes[0] ).not.toBe ( r.props.sizes[0] )

                expect ( r.props ).not.toHaveProperty ( 'test' )
        }) // it Copy a mixed structure

    it ( 'Data property has value "null"', async () => {
          // Fix: Deep copy process is losing object properties that are equal to 'null'
          const x = { name : null };
          const r = await walk ({data:x});
          expect ( r ).toHaveProperty ( 'name' )
          expect ( r.name ).toBe ( null )
    }) // it Data property has value null



    it ( 'html nodes - copy by reference', async () => {
        const data = {
                      name : 'Peter'
                    , pretendHTML : { nodeType: 1 }
                };
        const r = await walk ({ data });
        r.pretendHTML.something = 'hello';
        expect ( data.pretendHTML.something ).toBe ( 'hello' )   // Recognize html nodes and keep them as a reference
    }) // html nodes - copy by reference



  it ( 'Functions type - copy by reference', async () => {
            const data = {
                          name : 'Peter'
                        , func : () => 12
                    };

            const r = await walk ({ data });
            expect ( r.func() ).toBe ( 12 )
    }) // it Functions type - copy by reference



  it ( 'Own "__proto__" property - no prototype injection', async () => {
            const data = JSON.parse ( '{"__proto__": {"polluted": true}, "a": 1}' );   // own '__proto__' key, as delivered by untrusted JSON
            const r = await walk ({ data });
            expect ( Object.getPrototypeOf ( r ) ).toBe ( Object.prototype )                    // prototype must stay untouched
            expect ( r.polluted ).toBe ( undefined )                                            // nothing injected via inheritance
            expect ( r.a ).toBe ( 1 )
            expect ( Object.prototype.hasOwnProperty.call ( r, '__proto__' ) ).toBe ( true )    // copied as an own property
            expect ( Object.getOwnPropertyDescriptor ( r, '__proto__' ).value ).toEqual ({ polluted: true })
    }) // it Own "__proto__" property - no prototype injection



  it ( 'Property named "root" with object value', async () => {
            const data = {
                          root : { a: 1 }
                        , b    : 2
                    };
            const r = await walk ({ data });
            expect ( r ).toHaveProperty ( 'root' )
            expect ( r.root ).toEqual ({ a: 1 })
            expect ( r ).not.toHaveProperty ( 'a' )   // must not be flattened into the parent
            expect ( r.b ).toBe ( 2 )
    }) // it Property named "root" with object value



  it ( 'Property named "root" with primitive value', async () => {
            const data = {
                          root : 5
                        , b    : 2
                    };
            const r = await walk ({ data });
            expect ( r ).toHaveProperty ( 'root' )
            expect ( r.root ).toBe ( 5 )
            expect ( r.b ).toBe ( 2 )
    }) // it Property named "root" with primitive value



  it ( 'Property named "root" - breadcrumbs are correct', async () => {
            const data = {
                          root : { a: 1 }
                    };
            const visited = [];

            function oCallbackFn ({ resolve, value, breadcrumbs }) {
                      visited.push ( breadcrumbs )
                      resolve ( value )
                }

            const r = await walk ({ data, objectCallback: oCallbackFn });
            expect ( visited ).toContain ( 'root' )        // the real root object
            expect ( visited ).toContain ( 'root/root' )   // the property named 'root'
            expect ( r.root ).toEqual ({ a: 1 })
    }) // it Property named "root" - breadcrumbs are correct

}) // describe

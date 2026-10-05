"use strict"

import { describe, it, expect } from 'vitest'
import walk from '../src/main.js'


function delay ( value, time = 1 ) {
    return new Promise ( resolve => setTimeout ( () => resolve ( value ), time ) )
} // delay func.



describe ( 'Walk-async: awaited callbacks', () => {

    it.each ([ true, false ]) ( 'Await PASS replacements and IGNORE before visiting contents (copy: %s)', async copy => {
                const keys = [], objects = [];
                const data = { branch:{ count:1 }, skip:{ hidden:2 }, expand:3 }
                const result = await walk ({
                          data
                        , settings : { copy }
                        , objectCallback : async ({ value, key, PASS, IGNORE }) => {
                                              objects.push ( key )
                                              await delay ()
                                              if ( key === 'skip' )     return IGNORE()
                                              if ( key === 'branch' )   return PASS ({ count:100, nested:{ count:4 } })
                                              return value
                                          }
                        , keyCallback : async ({ value, key, IGNORE }) => {
                                              keys.push ( key )
                                              await delay ()
                                              if ( key === 'expand' )   return [{ remove:5, count:6 }]
                                              if ( key === 'remove' )   return IGNORE()
                                              return value * 2
                                          }
                    })

                expect ( objects ).toEqual ([ 'root', 'branch', 'skip', 'nested', '0' ])
                expect ( keys ).toEqual ([ 'expand', 'count', 'remove', 'count' ])
                if ( copy )    expect ( result ).toEqual ({ branch:{ count:100, nested:{ count:8 } }, expand:[{ count:12 }] })
                else           expect ( result ).toBeUndefined()
                expect ( data ).toEqual ({ branch:{ count:1 }, skip:{ hidden:2 }, expand:3 })
        }) // it Await instructions



    it ( 'Await each callback before starting the next one across queued levels', async () => {
                const events = [], extra = {};
                const data = { first:1, branch:{ second:2, deeper:{ third:3 } }, last:4 }
                async function callback ( context, received ) {
                    expect ( received ).toBe ( extra )
                    events.push ( `start:${context.breadcrumbs}` )
                    await delay ( undefined, context.key === 'first' ? 5 : 1 )
                    events.push ( `end:${context.breadcrumbs}` )
                    return context.value
                } // callback func.
                const result = await walk ({ data, objectCallback:callback, keyCallback:callback }, extra )
                const paths = ['root','root/first','root/branch','root/last','root/branch/second','root/branch/deeper','root/branch/deeper/third'];

                expect ( result ).toEqual ( data )
                expect ( events ).toEqual ( paths.flatMap ( path => [`start:${path}`, `end:${path}`] ) )
        }) // it Await order



    it.each ([ true, false ]) ( 'Await leaf side effects with no return (copy: %s)', async copy => {
                const values = []
                const result = await walk ({
                          data : { first:1, child:{ second:2 } }
                        , settings : { copy }
                        , keyCallback : async ({ value }) => { await delay (); values.push ( value ) }
                    })
                expect ( values ).toEqual ([1,2])
                if ( copy )    expect ( result ).toEqual ({ first:undefined, child:{ second:undefined } })
                else           expect ( result ).toBeUndefined()
        }) // it Await side effects



    it ( 'Await finite nested walks from both callbacks with separate ancestor state', async () => {
                const data = { number:1, child:{ number:2 } };
                data.self = data
                const copies = []
                const result = await walk ({
                          data
                        , objectCallback : async ({ value, key, IGNORE }) => {
                                              if ( key === 'self' )   return IGNORE()
                                              const copy = await walk ({ data:value })
                                              copies.push ( copy )
                                              return copy
                                          }
                        , keyCallback : async ({ value }) => {
                                              const numbers = await walk ({ data:[value], keyCallback:async ({ value }) => value * 2 })
                                              return numbers[0]
                                          }
                    })
                expect ( result.number ).toBe ( 2 )
                expect ( result.child.number ).toBe ( 4 )
                expect ( result ).not.toHaveProperty ( 'self' )
                expect ( copies[0] ).not.toBe ( data )
        }) // it Await nested walks



    it.each ([ 'objectCallback', 'keyCallback' ]) ( 'Propagate throws and rejected promises from %s', async name => {
                const error = new Error ( 'callback failed' )
                for ( const callback of [ () => { throw error }, async () => { await delay (); throw error } ] ) {
                            await expect ( walk ({ data:{ number:1 }, [name]:callback, timeout:100 }) ).rejects.toBe ( error )
                      }
        }) // it Propagate callback failures



    it ( 'Propagate a rejection from a nested walk', async () => {
                const error = new Error ( 'nested failure' )
                await expect ( walk ({
                          data : { number:1 }
                        , keyCallback : async () => await walk ({ data:{ leaf:2 }, keyCallback:async () => { throw error } })
                    }) ).rejects.toBe ( error )
        }) // it Nested rejection



    it ( 'Await explicit resolve values and retain reject as branch pruning', async () => {
                const result = await walk ({
                          data : { first:1, child:{ number:2 }, skip:{ hidden:3 } }
                        , objectCallback : async ({ value, key, resolve, reject }) => {
                                              await delay ()
                                              if ( key === 'skip' )   reject ( 'drop' )
                                              else                   resolve ( Promise.resolve ( value ) )
                                          }
                        , keyCallback : ({ value, resolve }) => setTimeout ( () => resolve ( value * 2 ), 1 )
                    })
                expect ( result ).toEqual ({ first:2, child:{ number:4 } })
        }) // it Explicit settlement



    it ( 'Consume PASS and IGNORE resolved by explicit callbacks', async () => {
                const result = await walk ({
                          data : { branch:{ number:1, nested:{ number:2 } }, drop:3 }
                        , objectCallback : ({ value, key, PASS, resolve }) => resolve ( Promise.resolve ( key === 'branch' ? PASS() : value ) )
                        , keyCallback : ({ value, key, IGNORE, resolve }) => resolve ( Promise.resolve ( key === 'drop' ? IGNORE() : value * 2 ) )
                    })
                expect ( result ).toEqual ({ branch:{ number:1, nested:{ number:4 } } })
        }) // it Explicit instructions



    it ( 'Await replacement promises supplied to PASS before checking their type and cycles', async () => {
                const replacement = { number:1, branch:{} };
                const result = await walk ({
                          data : {}
                        , objectCallback : async ({ PASS }) => PASS ( delay ( replacement ) )
                    })
                expect ( result.number ).toBe ( 1 )
                expect ( result.branch ).toBe ( result )
                const empty = await walk ({ data:{}, objectCallback:({ PASS }) => PASS ( Promise.resolve ( undefined ) ) })
                expect ( empty ).toBeUndefined()
                const error = new Error ( 'PASS failed' );
                await expect ( walk ({ data:{}, objectCallback:({ PASS }) => PASS ( Promise.reject ( error ) ) }) ).rejects.toBe ( error )
        }) // it Await PASS values



    it ( 'Keep timeout diagnostics while a PASS replacement is unresolved', async () => {
                await expect ( walk ({
                          data : {}
                        , objectCallback : ({ PASS }) => PASS ( new Promise ( () => {} ) )
                        , timeout : 10
                    }) ).rejects.toThrow ( "objectCallback at 'root'" )
        }) // it Timeout PASS values



    it ( 'Keep deep ancestor lookups independent across awaited and simultaneous walks', async () => {
                const shared = { number:1 };
                shared.self = shared
                let data = { first:shared, second:shared };
                for ( let index = 0; index < 40; index++ )   data = { child:data }
                const inner = []
                async function visit () {
                    return await walk ({
                              data
                            , settings : { breadcrumbs:false, parentPath:false }
                            , objectCallback : async ({ value }) => { await Promise.resolve (); return value }
                            , keyCallback : async ({ value }) => {
                                                  const copy = await walk ({ data })
                                                  inner.push ( copy )
                                                  return value + 1
                                              }
                        })
                } // visit func.
                const results = await Promise.all ([ visit(), visit() ]);
                expect ( inner ).toHaveLength ( 4 )
                const copies = []
                for ( let copy of [ ...results, ...inner ] ) {
                        for ( let index = 0; index < 40; index++ )   copy = copy.child
                        expect ( copy.first ).not.toBe ( copy.second )
                        expect ( copy.first.self ).toBe ( copy.first )
                        expect ( copy.second.self ).toBe ( copy.second )
                        expect ( copy.first ).not.toBe ( shared )
                        copies.push ( copy.first )
                    }
                expect ( new Set ( copies ).size ).toBe ( 6 )
                expect ( copies.slice ( 0, 2 ).map ( copy => copy.number ) ).toEqual ([2,2])
        }) // it Deep independent lookups



    it ( 'Await callback completion even when resolve is called before its await', async () => {
                const events = []
                const result = await walk ({
                          data : [1,2]
                        , keyCallback : async context => {
                                              const resolve = context.resolve;
                                              expect ( context.resolve ).toBe ( resolve )
                                              resolve ( context.value )
                                              await delay ()
                                              events.push ( context.key )
                                          }
                    })
                expect ( result ).toEqual ([1,2])
                expect ( events ).toEqual (['0','1'])
        }) // it Await explicit callback completion



    it ( 'Propagate a rejected resolve value while its callback awaits more work', async () => {
                const error = new Error ( 'resolved promise failed' )
                await expect ( walk ({
                          data : { number:1 }
                        , keyCallback : async ({ resolve }) => {
                                              resolve ( Promise.reject ( error ) )
                                              await delay ()
                                          }
                    }) ).rejects.toBe ( error )
        }) // it Rejected resolve value



    it.each ([ 'objectCallback', 'keyCallback' ]) ( 'Timeout an unresolved return promise from %s', async name => {
                await expect ( walk ({
                          data : { number:1 }
                        , [name] : () => new Promise ( () => {} )
                        , timeout : 10
                    }) ).rejects.toThrow ( new RegExp ( `${name} at 'root` ) )
        }) // it Timeout return promises



    it ( 'Give key diagnostics when paths are disabled', async () => {
                await expect ( walk ({
                          data : { number:1 }
                        , settings : { breadcrumbs:false, parentPath:false }
                        , keyCallback : ({ resolve }) => {}
                        , timeout : 10
                    }) ).rejects.toThrow ( "keyCallback at 'number'" )
        }) // it Timeout without paths



    it.each ([ true, false ]) ( 'Await replacements before closing cycles (copy: %s)', async copy => {
                const replacement = { number:1, back:{} };
                replacement.self = replacement
                const result = await walk ({
                          data : {}
                        , settings : { copy }
                        , objectCallback : async ({ value, key, PASS, IGNORE }) => {
                                              await delay ()
                                              if ( key === 'root' )   return replacement
                                              if ( key === 'self' )   return IGNORE()
                                              if ( key === 'back' )   return PASS ( replacement )
                                              return value
                                          }
                        , keyCallback : async () => await delay ( replacement )
                    })
                if ( copy ) {
                        expect ( result.number ).toBe ( result )
                        expect ( result.back ).toBe ( result )
                        expect ( result ).not.toHaveProperty ( 'self' )
                    }
                else    expect ( result ).toBeUndefined()
        }) // it Await circular replacements



    it.each ([ true, false ]) ( 'Bound awaited visits with cycle detection disabled (copy: %s)', async copy => {
                const data = { number:1 };
                data.self = data
                let calls = 0;
                const result = await walk ({
                          data
                        , settings : { copy, detectCycles:false }
                        , objectCallback : async ({ value, IGNORE }) => { await delay (); return ++calls === 4 ? IGNORE() : value }
                    })
                expect ( calls ).toBe ( 4 )
                if ( copy )    expect ( result ).toEqual ({ number:1, self:{ number:1, self:{ number:1 } } })
                else           expect ( result ).toBeUndefined()
        }) // it Bound awaited visits

}) // describe

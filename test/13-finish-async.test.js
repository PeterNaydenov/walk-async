"use strict"

import { describe, it, expect } from 'vitest'
import walk from '../src/main.js'



const delay = () => new Promise ( resolve => setTimeout ( resolve, 1 ) );
const modes = [ 'return', 'promise', 'resolve', 'delayed resolve' ];



function settle ( mode, callback ) {
    if ( mode === 'return' )   return callback
    if ( mode === 'promise' )   return async context => { await delay(); return callback ( context ) }
    if ( mode === 'resolve' )   return context => context.resolve ( callback ( context ) )
    return context => { const resolve = context.resolve; setTimeout ( () => resolve ( callback ( context ) ), 1 ) }
} // settle func.



describe ( 'Walk-async: awaited FINISH', () => {

    it.each ( modes ) ( 'Stop at an awaited final leaf through %s', async mode => {
                const replacement = { get unread () { throw new Error ( 'Final replacement was walked' ) } };
                const visited = [];
                const result = await walk ({
                          data : { queued:{ number:1 }, first:2, final:3, get later () { throw new Error ( 'Later getter was read' ) } }
                        , keyCallback : settle ( mode, ({ key, value, FINISH, isFinished }) => {
                                              expect ( isFinished ).toBe ( false )
                                              visited.push ( key )
                                              return key === 'final' ? FINISH ( Promise.resolve ( replacement ) ) : value
                                          })
                    })
                expect ( result ).toEqual ({ queued:{}, first:2, final:replacement })
                expect ( result.final ).toBe ( replacement )
                expect ( visited ).toEqual ([ 'first', 'final' ])
        }) // it Final leaf settlement



    it.each ( modes ) ( 'Await a final branch and its key callbacks through %s', async mode => {
                const objects = [], keys = [];
                const result = await walk ({
                          data : { queued:{ number:100 }, final:{ original:1 }, get later () { throw new Error ( 'Later getter was read' ) } }
                        , objectCallback : settle ( mode, context => {
                                              const { key, value, FINISH, PASS } = context;
                                              expect ( Object.hasOwn ( context, 'isFinished' ) ).toBe ( false )
                                              objects.push ( key )
                                              if ( key === 'root' )   return PASS()
                                              return key === 'final' ? FINISH ( Promise.resolve ({ first:2, nested:{ number:3 } }) ) : value
                                          })
                        , keyCallback : settle ( mode, ({ value, key, isFinished }) => {
                                              expect ( isFinished ).toBe ( true )
                                              keys.push ( key )
                                              return Promise.resolve ( value * 10 )
                                          })
                    })
                expect ( result ).toEqual ({ queued:{}, final:{ first:20, nested:{ number:30 } } })
                expect ( objects ).toEqual ([ 'root', 'queued', 'final' ])
                expect ( keys ).toEqual ([ 'first', 'number' ])
        }) // it Final branch settlement



    it.each ([ false, true ]) ( 'Await a final root payload (keyCallback: %s)', async keys => {
                const replacement = { number:2 }, seen = [];
                const result = await walk ({
                          data : { original:1 }
                        , objectCallback : async ({ FINISH }) => FINISH ( Promise.resolve ( replacement ) )
                        , keyCallback : keys ? async ({ value, isFinished }) => { seen.push ( isFinished ); await delay(); return value + 1 } : undefined
                    })
                expect ( result ).toEqual ({ number:keys ? 3 : 2 })
                if ( !keys )   expect ( result ).toBe ( replacement )
                expect ( seen ).toEqual ( keys ? [true] : [] )
        }) // it Final root payload



    it.each ([ false, true ]) ( 'Distinguish omitted and explicit undefined through resolve (include: %s)', async include => {
                const result = await walk ({ data:[1,2], keyCallback:({ FINISH, resolve }) => resolve ( include ? FINISH ( Promise.resolve ( undefined ) ) : FINISH() ) })
                expect ( result ).toEqual ( include ? [undefined] : [] )
        }) // it Omitted and explicit undefined



    it ( 'Wait for an async callback to complete after it resolves FINISH early', async () => {
                const events = [];
                const result = await walk ({
                          data : { final:{ number:1 }, after:2 }
                        , objectCallback : async ({ key, value, FINISH, resolve }) => {
                                              resolve ( key === 'final' ? FINISH ( value ) : value )
                                              await delay()
                                              events.push ( key )
                                          }
                        , keyCallback : async ({ value, FINISH, resolve, isFinished }) => {
                                              expect ( events ).toEqual ([ 'root', 'final' ])
                                              expect ( isFinished ).toBe ( true )
                                              resolve ( FINISH ( value ) )
                                              await delay()
                                              events.push ( 'key complete' )
                                          }
                    })
                expect ( result ).toEqual ({ final:{ number:1 } })
                expect ( events ).toEqual ([ 'root', 'final', 'key complete' ])
        }) // it Callback completion



    it.each ([ 'keyCallback', 'objectCallback' ]) ( 'Reject a rejected FINISH payload from %s', async name => {
                const error = new Error ( 'Final payload failed' );
                await expect ( walk ({ data:{ number:1 }, [name]:({ FINISH }) => FINISH ( Promise.reject ( error ) ) }) ).rejects.toBe ( error )
        }) // it Rejected payload



    it ( 'Propagate an async failure after explicit FINISH settlement', async () => {
                const error = new Error ( 'Callback failed after resolve' );
                await expect ( walk ({ data:[1], keyCallback:async ({ resolve, FINISH }) => { resolve ( FINISH ( 10 ) ); await delay(); throw error } }) ).rejects.toBe ( error )
        }) // it Failure after settlement



    it.each ([ 'keyCallback', 'objectCallback' ]) ( 'Keep an unresolved FINISH payload in timeout diagnostics for %s', async name => {
                const path = name === 'keyCallback' ? 'root/number' : 'root';
                await expect ( walk ({ data:{ number:1 }, timeout:10, [name]:({ FINISH }) => FINISH ( new Promise ( () => {} ) ) }) ).rejects.toThrow ( `${name} at '${path}'` )
        }) // it Pending final payload



    it ( 'Keep delayed nested finishing independent from an outer final branch', async () => {
                const result = await walk ({
                          data : { final:{ first:1, second:2 }, after:3 }
                        , objectCallback : async ({ key, value, FINISH }) => key === 'final' ? FINISH ( value ) : value
                        , keyCallback : async ({ value, isFinished }) => {
                                              expect ( isFinished ).toBe ( true )
                                              const inner = await walk ({ data:[10,20], keyCallback:settle ( 'delayed resolve', ({ value, FINISH, isFinished }) => { expect ( isFinished ).toBe ( false ); return FINISH ( value ) }) })
                                              expect ( inner ).toEqual ([10])
                                              return value
                                          }
                    })
                expect ( result ).toEqual ({ final:{ first:1, second:2 } })
        }) // it Independent nested finishing



    it ( 'Await a promised final branch without copying', async () => {
                const data = { final:{ number:1 }, after:2 }, seen = [];
                const result = await walk ({
                          data
                        , settings : { copy:false }
                        , objectCallback : ({ value, key, resolve, FINISH }) => resolve ( key === 'final' ? FINISH ( Promise.resolve ( value ) ) : value )
                        , keyCallback : async ({ value, isFinished }) => { await delay(); seen.push ([ value, isFinished ]) }
                    })
                expect ( result ).toBeUndefined()
                expect ( seen ).toEqual ([ [1,true] ])
                expect ( data ).toEqual ({ final:{ number:1 }, after:2 })
        }) // it No-copy final branch

}) // describe

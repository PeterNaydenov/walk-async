"use strict"

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import esm from '../dist/walk-async.esm.mjs'
import packaged from '@peter.naydenov/walk-async'

const require = createRequire ( import.meta.url );
const source = readFileSync ( new URL ( '../dist/walk-async.umd.js', import.meta.url ), 'utf8' );
const browser = { setTimeout, clearTimeout };
runInNewContext ( source, browser )
const commonjs = { module:{ exports:{} }, exports:{}, setTimeout, clearTimeout };
runInNewContext ( source, commonjs )
let amd;
const define = factory => { amd = factory() };
define.amd = true
runInNewContext ( source, { define, setTimeout, clearTimeout } )
const formats = [
          ['ESM', esm]
        , ['CommonJS', require ( '../dist/walk-async.cjs' )]
        , ['UMD browser', browser.walkAsync]
        , ['UMD CommonJS', commonjs.module.exports]
        , ['UMD AMD', amd]
        , ['Package import', packaged]
        , ['Package require', require ( '@peter.naydenov/walk-async' )]
    ];



describe ( 'Walk-async: generated distributions', () => {

    it.each ( formats ) ( '%s supports awaited instructions, paths, cycles, and no-copy traversal', async ( name, walk ) => {
                const data = { branch:{ count:1, nested:{ count:2 } }, drop:3 };
                data.self = data
                const result = await walk ({
                          data
                        , objectCallback : async ({ value, key, PASS }) => key === 'branch' ? PASS ({ ...value, count:100 }) : value
                        , keyCallback : async ({ value, key, parentPath, IGNORE }) => {
                                              expect ( Object.isFrozen ( parentPath ) ).toBe ( true )
                                              return key === 'drop' ? IGNORE() : value * 2
                                          }
                    })
                expect ( result.branch ).toEqual ({ count:100, nested:{ count:4 } })
                expect ( result.self ).toBe ( result )
                expect ( result ).not.toHaveProperty ( 'drop' )
                let total = 0;
                expect ( await walk ({ data:{ values:[1,2] }, settings:{ copy:false, detectCycles:false }, keyCallback:async ({ value }) => { total += value } }) ).toBeUndefined()
                expect ( total ).toBe ( 3 )
                const objects = [], flags = [];
                const stopped = await walk ({
                          data : { queued:{ number:100 }, final:{ first:1, nested:{ number:2 } }, after:3 }
                        , objectCallback : ({ key, value, FINISH, resolve }) => {
                                              objects.push ( key )
                                              resolve ( key === 'final' ? FINISH ( Promise.resolve ( value ) ) : value )
                                          }
                        , keyCallback : async ({ key, value, isFinished, FINISH }) => {
                                              flags.push ( isFinished )
                                              return key === 'number' ? FINISH ( Promise.resolve ( value * 10 ) ) : value * 10
                                          }
                    })
                expect ( stopped ).toEqual ({ queued:{}, final:{ first:10, nested:{ number:20 } } })
                expect ( objects ).toEqual ([ 'root', 'queued', 'final' ])
                expect ( flags ).toEqual ([ true, true ])
                expect ( await walk ({ data:[1,2], keyCallback:({ FINISH }) => FINISH() }) ).toEqual ([])
                const error = new Error ( name );
                await expect ( walk ({ data:[1], keyCallback:async () => { throw error }, timeout:100 }) ).rejects.toBe ( error )
                expect ( await walk ({ data:{}, objectCallback:({ resolve }) => resolve ( 'replacement' ) }) ).toBe ( 'replacement' )
        }) // it Distribution contracts

}) // describe

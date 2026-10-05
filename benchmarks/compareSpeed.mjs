"use strict"

import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import sync from '../../git-walk/src/main.js'
import asyncWalk from '../src/main.js'

const shapes = [
          ['flat', () => Object.fromEntries ( Array.from ( { length:1000000 }, ( value, index ) => [`key${index}`,index] ) )]
        , ['records', () => Array.from ( { length:100000 }, ( value, id ) => ({ id, name:`name${id}`, metadata:{ active:true, score:id, tags:['a','b'] } }) )]
        , ['deep', () => {
                              let data = { number:1 };
                              for ( let index = 0; index < 4000; index++ )   data = { child:data }
                              return data
                          }]
    ];
const modes = [
          ['sync', sync, ({ value }) => value]
        , ['async return', asyncWalk, ({ value }) => value]
        , ['async promise', asyncWalk, async ({ value }) => value]
        , ['async resolve', asyncWalk, ({ value, resolve }) => resolve ( value )]
    ];
const settings = [
          ['defaults', {}]
        , ['paths off', { breadcrumbs:false, parentPath:false }]
        , ['visit only', { copy:false, breadcrumbs:false, parentPath:false }]
    ];
const report = { node:process.version, platform:process.platform, architecture:process.arch, recordedAt:new Date().toISOString(), warmups:1, samples:5, shapes:[] };

async function measure ( data, row ) {
    const start = performance.now();
    const result = row.walk ({ data, settings:row.settings, keyCallback:row.callback, objectCallback:row.callback });
    if ( row.mode !== 'sync' )   await result
    return performance.now() - start
} // measure func.

for ( const [name, create] of shapes ) {
        const data = create();
        const rows = [];
        for ( const [setting, config] of settings ) {
                for ( const [mode, walk, callback] of modes )   rows.push ({ setting, settings:config, mode, walk, callback, milliseconds:[] })
            }
        console.log ( `Measuring ${name}: one warmup and five rotating samples for twelve combinations` )
        for ( const row of rows )   await measure ( data, row )
        for ( let sample = 0; sample < 5; sample++ ) {
                for ( let offset = 0; offset < rows.length; offset++ ) {
                        const row = rows[( offset + sample * 5 ) % rows.length];
                        row.milliseconds.push ( await measure ( data, row ) )
                    }
                console.log ( `${name}: sample ${sample + 1} complete` )
            }
        const records = rows.map ( ({ walk, callback, ...row }) => {
            row.median = [...row.milliseconds].sort ( (a,b) => a - b )[2]
            return row
        })
        report.shapes.push ({ name, rows:records })
        console.log ( JSON.stringify ( records.map ( ({ setting, mode, median }) => ({ setting, mode, median:Number ( median.toFixed ( 2 ) ) }) ) ) )
        writeFileSync ( new URL ( './compareSpeed.results.json', import.meta.url ), JSON.stringify ( report, null, 2 ) + '\n' )
    }

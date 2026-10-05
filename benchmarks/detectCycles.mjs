"use strict"

import { performance } from 'node:perf_hooks'
import { writeFileSync } from 'node:fs'
import walk from '../src/main.js'

const shapes = [
          ['flat', () => Object.fromEntries ( Array.from ( { length:1000000 }, ( value, index ) => [`key${index}`,index] ) )]
        , ['records', () => Array.from ( { length:100000 }, ( value, id ) => ({ id, name:`name${id}`, metadata:{ active:true, score:id, tags:['a','b'] } }) )]
        , ['deep', () => {
                              let data = { number:1 };
                              for ( let index = 0; index < 4000; index++ )   data = { child:data }
                              return data
                          }]
    ];
const settings = [];
for ( const copy of [true,false] ) {
        for ( const paths of [true,false] ) {
                for ( const detectCycles of [true,false] ) {
                        settings.push ({ copy, breadcrumbs:paths, parentPath:paths, detectCycles })
                    }
            }
    }
const report = { node:process.version, platform:process.platform, architecture:process.arch, warmups:1, samples:3, shapes:[] };


async function measure ( data, settings ) {
    const start = performance.now();
    await walk ({ data, settings, objectCallback:({ value }) => value, keyCallback:({ value }) => value })
    return performance.now() - start
} // measure func.



for ( const [name, create] of shapes ) {
        const data = create();
        const rows = settings.map ( settings => ({ settings, milliseconds:[] }) );
        console.log ( `Measuring ${name}: one warmup and three rotating samples for eight settings` )
        for ( const row of rows )   await measure ( data, row.settings )
        for ( let sample = 0; sample < 3; sample++ ) {
                for ( let offset = 0; offset < rows.length; offset++ ) {
                        const row = rows[( offset + sample * 3 ) % rows.length];
                        row.milliseconds.push ( await measure ( data, row.settings ) )
                    }
                console.log ( `${name}: sample ${sample + 1} complete` )
            }
        for ( const row of rows ) {
                row.median = [...row.milliseconds].sort ( (a,b) => a - b )[1]
                console.log ( `${name} copy:${row.settings.copy} paths:${row.settings.parentPath} detectCycles:${row.settings.detectCycles} median:${row.median.toFixed ( 2 )}ms` )
            }
        report.shapes.push ({ name, rows })
    }
writeFileSync ( new URL ( './detectCycles.results.json', import.meta.url ), JSON.stringify ( report, null, 2 ) + '\n' )

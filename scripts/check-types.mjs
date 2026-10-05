"use strict"

import { readFileSync, mkdtempSync, mkdirSync, symlinkSync, cpSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath ( new URL ( '../', import.meta.url ) );
const temporary = mkdtempSync ( join ( tmpdir(), 'walk-async-types-' ) );
const packageDir = join ( temporary, 'node_modules/@peter.naydenov/walk-async' );
const proposed = process.argv.includes ( '--proposed' );
const source = readFileSync ( new URL ( '../test/types/consumer.mts', import.meta.url ), 'utf8' );
mkdirSync ( dirname ( packageDir ), { recursive:true } )

// Validate the proposed adjustment only in a disposable package copy.
// The repository's package.json is never modified.
if ( proposed ) {
        mkdirSync ( packageDir )
        for ( const directory of ['dist','types'] )   cpSync ( join ( root, directory ), join ( packageDir, directory ), { recursive:true } )
        const config = JSON.parse ( readFileSync ( join ( root, 'package.json' ), 'utf8' ) );
        config.exports['.'] = { types:'./types/main.d.ts', ...config.exports['.'] }
        writeFileSync ( join ( packageDir, 'package.json' ), JSON.stringify ( config, null, 2 ) + '\n' )
    }
else    symlinkSync ( root, packageDir, 'dir' )

console.log ( proposed ? 'Checking the proposed exports.types adjustment' : 'Checking current package exports' )
for ( const [extension, mode] of [['mts','NodeNext'],['cts','NodeNext'],['ts','Bundler']] ) {
        const file = join ( temporary, `consumer.${extension}` );
        writeFileSync ( file, source )
        const result = spawnSync ( join ( root, 'node_modules/.bin/tsc' ), [
                      '--ignoreConfig', '--strict', '--noEmit', '--target', 'ES2022'
                    , '--module', mode === 'Bundler' ? 'ESNext' : 'NodeNext'
                    , '--moduleResolution', mode, file
                ], { encoding:'utf8' } );
        console.log ( `${extension} / ${mode}: ${result.status === 0 ? 'passed' : 'failed'}` )
        if ( result.status !== 0 ) {
                console.log ( result.stdout || result.stderr )
                process.exitCode = 1
            }
    }

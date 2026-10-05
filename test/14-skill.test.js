"use strict"

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs'
import { resolve, dirname, relative, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import walk from '../src/main.js'



const folder = fileURLToPath ( new URL ( '../skills/walk-async/', import.meta.url ) );
const entry = readFileSync ( join ( folder, 'SKILL.md' ), 'utf8' );
const examples = readFileSync ( join ( folder, 'references/examples.md' ), 'utf8' );
const AsyncFunction = Object.getPrototypeOf ( async function () {} ).constructor;
const references = ['callbacks.md','control-flow.md','settings.md','examples.md'];
const snippets = [
          { heading:'Mask passwords', code:entry.match ( /```js\n([\s\S]*?)\n```/ )[1] }
        , ...[...examples.matchAll ( /^## ([^\n]+)\n\n```js\n([\s\S]*?)\n```/gm )].map ( match => ({ heading:match[1], code:match[2] }) )
    ];



function links ( text ) {
    return [...text.matchAll ( /\[[^\]]+\]\(([^)]+)\)/g )].map ( match => match[1] )
} // links func.



function anchors ( text ) {
    return [...text.matchAll ( /^#{1,6} (.+)$/gm )].map ( match => match[1].toLowerCase().replace ( /[^\w\s-]/g, '' ).replace ( /\s/g, '-' ) )
} // anchors func.



function checkLinks ( base, filename, portable ) {
    const text = readFileSync ( join ( base, filename ), 'utf8' );
    for ( const target of links ( text ) ) {
            if ( /^https?:/.test ( target ) )   continue
            const [ path, anchor ] = target.split ( '#' );
            const location = path ? resolve ( dirname ( join ( base, filename ) ), path ) : join ( base, filename );
            expect ( existsSync ( location ), target ).toBe ( true )
            if ( portable )   expect ( relative ( base, location ).startsWith ( '..' ), target ).toBe ( false )
            if ( anchor )   expect ( anchors ( readFileSync ( location, 'utf8' ) ), target ).toContain ( anchor )
        }
} // checkLinks func.



async function runExample ( code, mode ) {
    const events = [];
    let active = 0, maxActive = 0;
    function callback ( fn, kind ) {
        return context => {
            expect ( typeof context.IGNORE ).toBe ( 'function' )
            expect ( typeof context.FINISH ).toBe ( 'function' )
            expect ( Object.hasOwn ( context, 'isFinished' ) ).toBe ( kind === 'key' )
            if ( kind === 'object' )   expect ( typeof context.PASS ).toBe ( 'function' )
            else                      expect ( typeof context.isFinished ).toBe ( 'boolean' )
            events.push ({ kind, key:context.key, finished:context.isFinished })
            active++
            maxActive = Math.max ( maxActive, active )
            if ( mode === 'resolve' ) {
                    const done = context.resolve;
                    return Promise.resolve().then ( () => fn ( context ) ).then ( value => { done ( value ) } ).finally ( () => { active-- } )
                }
            if ( mode === 'promise' )   return Promise.resolve().then ( () => fn ( context ) ).finally ( () => { active-- } )
            // Observe callback completion without reading settlement getters.
            const returned = fn ( context );
            return Promise.resolve ( returned ).finally ( () => { active-- } )
        }
    } // callback func.

    function measuredWalk ( options ) {
        const original = structuredClone ( options.data );
        const config = { ...options };
        if ( options.keyCallback )      config.keyCallback = callback ( options.keyCallback, 'key' )
        if ( options.objectCallback )   config.objectCallback = callback ( options.objectCallback, 'object' )
        const task = walk ( config );
        expect ( task ).toBeInstanceOf ( Promise )
        return task.then ( result => { expect ( options.data ).toEqual ( original ); return result } )
    } // measuredWalk func.

    const source = code.replace ( /^import .*\n/gm, '' );
    const result = await new AsyncFunction ( 'walk', `${source}\nreturn { result, data, paths:typeof paths === 'undefined' ? undefined : paths, found:typeof found === 'undefined' ? undefined : found, flags:typeof flags === 'undefined' ? undefined : flags, visits:typeof visits === 'undefined' ? undefined : visits }` ) ( measuredWalk );
    expect ( maxActive ).toBeLessThanOrEqual ( 1 )
    expect ( active ).toBe ( 0 )
    return { ...result, events }
} // runExample func.



describe ( 'Walk-async: portable skill', () => {

    it ( 'Keep a short entrypoint, precise metadata, and four direct references', () => {
                const metadata = entry.match ( /^---\n([\s\S]*?)\n---\n/ );
                expect ( metadata ).not.toBeNull()
                expect ( metadata[1] ).toMatch ( /^name: walk-async$/m )
                const description = metadata[1].split ( 'description: >-\n' )[1].trim();
                expect ( description.length ).toBeGreaterThan ( 0 )
                expect ( description.length ).toBeLessThanOrEqual ( 1024 )
                expect ( entry.slice ( metadata[0].length ).split ( '\n' ).length ).toBeLessThan ( 500 )
                expect ( links ( entry ).sort() ).toEqual ( references.map ( name => 'references/' + name ).sort() )
                expect ( readdirSync ( join ( folder, 'references' ) ).sort() ).toEqual ( references.sort() )
                for ( const name of references ) {
                        const text = readFileSync ( join ( folder, 'references', name ), 'utf8' );
                        if ( text.split ( '\n' ).length > 100 )   expect ( text ).toContain ( '## Contents' )
                    }
        }) // it Skill structure



    it ( 'Keep links valid when the complete folder is installed elsewhere', () => {
                const temporary = mkdtempSync ( join ( tmpdir(), 'walk-async-skill-' ) );
                try {
                        cpSync ( folder, temporary, { recursive:true } )
                        for ( const name of ['SKILL.md', ...references.map ( name => 'references/' + name )] )   checkLinks ( temporary, name, true )
                    }
                finally { rmSync ( temporary, { recursive:true } ) }
                const root = resolve ( folder, '../..' );
                for ( const name of ['README.md','Migration.guide.md','skills/README.md'] )   checkLinks ( root, name, false )
        }) // it Portable links



    it ( 'Keep all twelve reference examples independently runnable', () => {
                expect ( snippets.length ).toBe ( 13 )
                for ( const { code } of snippets )   expect ( code ).toContain ( "import walk from '@peter.naydenov/walk-async'" )
        }) // it Runnable example inventory



    describe.each ([ 'as written', 'promise', 'resolve' ]) ( 'Skill examples: %s callbacks', mode => {
        it.each ( snippets ) ( '$heading', async ({ heading, code }) => {
                    const observed = await runExample ( code, mode );
                    const { result, data, events } = observed;
                    const keys = events.filter ( event => event.kind === 'key' );
                    const objects = events.filter ( event => event.kind === 'object' );
                    switch ( heading ) {
                        case 'Mask passwords':
                            expect ( result ).toEqual ({ user:{ password:'[hidden]', name:'Peter' } })
                            expect ( data.user.password ).toBe ( 'secret' )
                            break
                        case 'Remove leaf keys':
                            expect ( result ).toEqual ({ name:'Peter', nested:{ count:2 } })
                            expect ( data.nested.token ).toBe ( 'abc' )
                            break
                        case 'Prune a whole branch':
                            expect ( result ).toEqual ({ profile:{ name:'Peter' } })
                            expect ( objects.map ( event => event.key ) ).toEqual ([ 'root','profile','metadata' ])
                            expect ( keys ).toEqual ([])
                            break
                        case 'PASS with a replacement':
                            expect ( result ).toEqual ({ branch:{ count:100, nested:{ count:6 } } })
                            expect ( keys.map ( event => event.key ) ).toEqual ([ 'count' ])
                            expect ( data.branch.count ).toBe ( 2 )
                            break
                        case 'Inspect with a parent path':
                            expect ( result ).toBeUndefined()
                            expect ( observed.paths ).toEqual ([ ['root','profile','age'] ])
                            break
                        case 'Stop at a matching leaf':
                            expect ( result ).toEqual ([12,22,33])
                            expect ( keys.map ( event => event.key ) ).toEqual ([ '0','1','2' ])
                            break
                        case 'Search without copying':
                            expect ( result ).toBeUndefined()
                            expect ( observed.found ).toBe ( 33 )
                            expect ( keys.map ( event => event.key ) ).toEqual ([ 'a','b' ])
                            break
                        case 'Process a final branch':
                            expect ( result ).toEqual ({ a:12, c:{ internal:44 } })
                            expect ( objects.map ( event => event.key ) ).toEqual ([ 'root','c' ])
                            expect ( keys.map ( event => event.finished ) ).toEqual ([false,true,true,true])
                            expect ( result.c ).not.toBe ( data.c )
                            break
                        case 'Copy circular and shared references':
                            expect ( result ).not.toBe ( data )
                            expect ( result.self ).toBe ( result )
                            expect ( result.a ).not.toBe ( result.b )
                            expect ( result.a ).toEqual ({ count:1 })
                            expect ( data.a ).toBe ( data.b )
                            break
                        case 'Await a lookup':
                            expect ( result ).toEqual ({ userId:{ id:42, active:true }, nested:{ userId:{ id:7, active:true } } })
                            break
                        case 'Use resolve and reject':
                            expect ( result ).toEqual ({ number:4, nested:{ number:6 } })
                            expect ( data.password ).toBe ( 'secret' )
                            break
                        case 'Settle a final branch payload':
                            expect ( result ).toEqual ({ final:{ first:20, nested:{ number:30 } } })
                            expect ( observed.flags ).toEqual ([true,true])
                            expect ( objects.map ( event => event.key ) ).toEqual ([ 'root','final' ])
                            break
                        case 'Observe sequential callbacks':
                            expect ( result ).toEqual ({ first:{ a:1 }, second:{ b:2 } })
                            expect ( observed.visits ).toEqual ([ 'object root','object first','object second','key a','key b' ])
                            break
                        default:
                            throw new Error ( 'Unchecked example: ' + heading )
                    }
                    if ( !['Process a final branch','Settle a final branch payload'].includes ( heading ) )   expect ( keys.every ( event => event.finished === false ) ).toBe ( true )
            }) // it Example contract
    }) // describe Callback modes

}) // describe

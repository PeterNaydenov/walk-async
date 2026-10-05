"use strict"

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import walk from '../src/main.js'

const readme = readFileSync ( new URL ( '../README.md', import.meta.url ), 'utf8' );
const snippets = [...readme.matchAll ( /```js\n([\s\S]*?)\n```/g )].map ( match => match[1] );
const AsyncFunction = Object.getPrototypeOf ( async function () {} ).constructor;


async function example ( marker, fetch ) {
    const snippet = snippets.find ( snippet => snippet.includes ( marker ) );
    expect ( snippet ).toBeDefined()
    const code = snippet.replace ( /^import .*\n/gm, '' );
    return await new AsyncFunction ( 'walk', 'fetch', `${code}\nreturn { result:typeof result === 'undefined' ? undefined : result, total:typeof total === 'undefined' ? undefined : total, data:typeof data === 'undefined' ? undefined : data, found:typeof found === 'undefined' ? undefined : found }` ) ( walk, fetch )
} // example func.



describe ( 'Walk-async: executable README examples', () => {

    it.each ([
              ['if ( value === 33 )', [12,22,33]]
            , ['let data = { a:12', { a:12, b:15, c:{ internal:44, in1:'bbb', in2:'ccc' } }]
            , ['if ( isFinished )', { a:12, b:15, c:{ internal:44 } }]
            , ['history :', { user:{ name:'Peter', email:'hidden' } }]
            , ['internalCode:42', { profile:{ name:'PETER', active:true }, visits:3 }]
            , ['archive:{ events:', { name:'Peter' }]
            , ['outside:1', { branch:{ count:2, nested:{ count:6 } }, outside:2 }]
            , ['PASS ({ ...value, count:100 })', { branch:{ count:100, nested:{ count:6 } } }]
            , ["data : { password:'secret'", { name:'Peter' }]
            , ["keyCallback : omitKeys", { name:'Peter' }]
            , ["data : { name:'Peter', password:'secret' }", { name:'Peter' }]
        ]) ( 'Run the transformation example containing %s', async ( marker, expected ) => {
                expect ( ( await example ( marker ) ).result ).toEqual ( expected )
        }) // it Transform examples



    it.each ([ ['scores  :', 60], ['detectCycles:false', 6] ]) ( 'Run the deep forEach example containing %s', async ( marker, total ) => {
                const result = await example ( marker );
                expect ( result.result ).toBeUndefined()
                expect ( result.total ).toBe ( total )
        }) // it Deep forEach examples



    it ( 'Keep the circle inside the copy in the documented example', async () => {
                const { data, result } = await example ( 'data.self = data' );
                expect ( result ).not.toBe ( data )
                expect ( result.self ).toBe ( result )
        }) // it Circular example



    it ( 'Keep documented built-in and function references', async () => {
                const { data, result } = await example ( "greet:() => 'Hello'" );
                expect ( result.profile ).not.toBe ( data.profile )
                expect ( result.when ).toBe ( data.when )
                expect ( result.greet ).toBe ( data.greet )
        }) // it Reference example



    it ( 'Finish the documented search without building a copy', async () => {
                const { found, result } = await example ( 'let found;' );
                expect ( found ).toEqual ({ id:2 })
                expect ( result ).toBeUndefined()
        }) // it Early search



    it ( 'Await fetch and visit its returned containers without fetching their leaves', async () => {
                const urls = []
                const fetch = async url => {
                    urls.push ( url )
                    return { json:async () => ({ number:2 }) }
                } // fetch func.
                const { result } = await example ( 'const response = await fetch', fetch );
                expect ( urls ).toEqual ( ['https://example.test/first','https://example.test/second'] )
                expect ( result ).toEqual ({ first:{ number:2 }, nested:{ second:{ number:2 } } })
        }) // it Async I/O example

}) // describe

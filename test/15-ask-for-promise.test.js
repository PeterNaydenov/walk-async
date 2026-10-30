"use strict"

import { describe, expect, it, vi } from 'vitest'

vi.mock ( 'ask-for-promise', async importOriginal => {
    const original = await importOriginal()
    return { default:vi.fn ( original.default ) }
})

import askForPromise from 'ask-for-promise'
import walk from '../src/main.js'

describe ( 'ask-for-promise integration', () => {
    it ( 'creates tasks for traversal and explicit callback settlement', async () => {
        askForPromise.mockClear()
        const result = await walk ({
                  data : { first:1, second:2 }
                , keyCallback : ({ value, resolve }) => resolve ( value * 2 )
            })
        expect ( result ).toEqual ({ first:2, second:4 })
        expect ( askForPromise ).toHaveBeenCalled()
    })
})

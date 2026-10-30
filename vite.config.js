import { defineConfig } from 'vite';


// Vite builds with Rolldown. The module resolution is built in, so no
// extra plugin is needed. The ask-for-promise dependency is bundled so
// each distribution, including the browser UMD build, is self-contained.
//
// The build target is ES2015 syntax; ask-for-promise also requires WeakRef
// support from the runtime.

export default defineConfig ({
      build: {
            lib: {
                  entry    : 'src/main.js'
                , name     : 'walkAsync'
                , formats  : [ 'es', 'cjs', 'umd' ]
                , fileName : format => format === 'es'  ? 'walk-async.esm.mjs'
                                : format === 'cjs' ? 'walk-async.cjs'
                                : 'walk-async.umd.js'
            }
        , target   : 'es2015'
        , minify  : true
      }
})

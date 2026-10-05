import walk, { type CallbackArgs, type KeyCallbackArgs, type FinishFunction, type ObjectCallbackArgs, type KeyCallback, type ObjectCallback, type Settings, type Options, type Resolve, type Reject, type IgnoreFunction, type PassFunction } from '@peter.naydenov/walk-async'
const settings: Settings = { copy:false, breadcrumbs:false, parentPath:false, detectCycles:false }
const keyCallback: KeyCallback = async ({ value, key, IGNORE, parentPath, breadcrumbs }) => {
    const currentKey: string = key
    const path: readonly string[] | undefined = parentPath
    const breadcrumb: string | undefined = breadcrumbs
    // @ts-expect-error parentPath is read-only
    parentPath?.push ('x')
    return key === 'drop' ? IGNORE() : value
}
const objectCallback: ObjectCallback = async ({ value, key, PASS }) => key === 'branch' ? PASS ( undefined ) : value
const options: Options = { data:{ number:1 }, settings, keyCallback, objectCallback, timeout:100 }
const result: Promise<unknown> = walk ( options, 'extra' )
const legacy: KeyCallback = ({ value, resolve, reject }) => { const done: Resolve = resolve; const drop: Reject = reject; done ( value ) }
function helpers ( context: ObjectCallbackArgs ) { const ignore: IgnoreFunction = context.IGNORE; const pass: PassFunction = context.PASS; return pass ( ignore() ) }
function keys ( context: CallbackArgs ) {
    // @ts-expect-error PASS is only provided to objectCallback
    context.PASS()
}

const finishing: KeyCallback = async ({ value, isFinished, FINISH }) => {
    const final: boolean = isFinished
    const finish: FinishFunction = FINISH
    return final ? finish ( Promise.resolve ( value ) ) : value
}
function finalKeys ( context: KeyCallbackArgs ) { const final: boolean = context.isFinished; return context.FINISH() }
function finalObject ( context: ObjectCallbackArgs ) {
    // @ts-expect-error isFinished is only provided to keyCallback
    context.isFinished
    const finish: FinishFunction = context.FINISH
    return finish ( undefined )
}
const explicitFinish: ObjectCallback = ({ FINISH, resolve }) => resolve ( FINISH ( Promise.resolve ({ number:1 }) ) )

import {
    GirBoolean,
    GirInfoElements,
    GirInfoAttrs,
    GirCallableParams,
    GirCallableReturn,
    PartOfModule,
    DescCallback,
    DescCallbackInterface,
} from '.'

export interface GirCallbackElement extends PartOfModule, GirInfoElements {
    /** A callback closure, that is a function called when a signal is emitted (as an answer to that signal) */
    $: GirInfoAttrs & {
        /** name of the callback */
        name: string
        /** the C type returned by the callback closure (i.e. function) */
        'c:type'?: string
        /** Binary attribute, true if the callback can throw an error */
        throws?: GirBoolean
    }

    /* Other elements a property can contain */

    parameters?: [GirCallableParams]
    'return-value'?: GirCallableReturn[]

    // CUSTOM
    _girType?: 'callback'
    _desc?: DescCallback

    /**
     * Interface for callback types
     */
    _descInterface?: DescCallbackInterface
}

import type {
    GirCallableAttrs,
    GirInfoAttrs,
    GirDocElement,
    PartOfClass,
    GirCallableParams,
    GirCallableReturn,
    DescFunction,
} from '.'

export interface GirFunctionElement extends PartOfClass, GirDocElement {
    /** element defining a standalone function (as usual in most programming languages) */
    $: GirInfoAttrs & GirCallableAttrs

    parameters?: [GirCallableParams]
    'return-value'?: GirCallableReturn[]

    // CUSTOM

    _desc?: DescFunction
}

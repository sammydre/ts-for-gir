import { TsType, TsDoc } from './index.js'

/**
 * Holds the data to generate a parameter of a function or return value in/for Typescript
 */
export interface TsParameter {
    name: string
    type: TsType[]

    /** If `true` the parameter is a rest parameter like `(...names: string[])` */
    isRest: boolean

    girTypeName: 'callable-param'

    /** Typescript data to generate documentations in TSDoc style */
    doc: TsDoc
}

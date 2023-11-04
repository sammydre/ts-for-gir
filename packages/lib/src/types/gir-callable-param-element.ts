import type { PartOfClass, TsParameter } from './index.js'
import * as parser from '@gi.ts/parser'

export interface GirCallableParamElement extends PartOfClass, parser.GirCallableParamElement {
    _tsData?: TsParameter
}

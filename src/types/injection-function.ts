import type { TsFunction, InjectionParameter, InjectionInstanceParameter, InjectionType } from './index.js'

export interface InjectionFunction
    extends Pick<TsFunction, 'name'>,
        Partial<Pick<TsFunction, 'isArrowType' | 'isStatic' | 'isGlobal' | 'isVirtual'>> {
    returnType?: InjectionType
    inParams?: InjectionParameter[]
    outParams?: InjectionParameter[]
    instanceParameters?: InjectionInstanceParameter[]
}

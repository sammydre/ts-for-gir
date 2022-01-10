/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import TemplateProcessor from './template-processor.js'
import { Transformation, C_TYPE_MAP, FULL_TYPE_MAP, POD_TYPE_MAP, POD_TYPE_MAP_ARRAY } from './transformation.js'
import { Logger } from './logger.js'
import { Utils } from './utils.js'
import { SymTable } from './symtable.js'
import { typePatches } from './type-patches.js'

import type {
    GirRepository,
    GirNamespace,
    GirAliasElement,
    GirEnumElement,
    GirFunctionElement,
    GirClassElement,
    GirArrayType,
    GirType,
    GirInclude,
    GirCallableParams,
    GirCallableParamElement,
    GirVirtualMethodElement,
    GirSignalElement,
    GirCallableReturn,
    GirRecordElement,
    GirCallbackElement,
    GirConstantElement,
    GirBitfieldElement,
    GirFieldElement,
    GirPropertyElement,
    GirUnionElement,
    TypeArraySuffix,
    TypeNullableSuffix,
    TypeSuffix,
    GirConstructorElement,
    InheritanceTable,
    ParsedGir,
    GenerateConfig,
    FunctionDescription,
    PropertyDescription,
    FunctionMap,
    LocalNameCheck,
    LocalNameType,
    LocalName,
    LocalNames,
    ClassDetails,
    VarDesc,
    ConstantDescription,
    GirInterfaceElement,
} from './types/index.js'

import {
    MAXIMUM_RECURSION_DEPTH,
    STATIC_NAME_ALREADY_EXISTS,
    COMMENT_REG_EXP,
    PARAM_REG_EXP,
    OPT_PARAM_REG_EXP,
    FALSY_FUNCTION_DESCRIPTION,
    FALSY_LOCAL_NAME_CHECK,
    FALSY_PROPERTY_DESCRIPTION,
} from './constants.js'

export class GirModule {
    /**
     * Array of all gir modules
     */
    static allGirModules: GirModule[] = []
    /**
     * E.g. 'Gtk'
     */
    namespace: string
    /**
     * E.g. '3.0'
     */
    version = '0.0'
    /**
     * E.g. 'Gtk-3.0'
     */
    packageName: string
    /**
     * E.g. 'Gtk30'
     * Is used in the generated index.d.ts, for example: `import * as Gtk30 from "./Gtk-3.0";`
     */
    importName: string

    dependencies: string[] = []
    private _transitiveDependencies: string[] = []

    set transitiveDependencies(deps: string[]) {
        this._transitiveDependencies = this.checkTransitiveDependencies(deps)
    }

    get transitiveDependencies(): string[] {
        return this._transitiveDependencies
    }

    get allDependencies(): string[] {
        return [...new Set([...this.dependencies, ...this.transitiveDependencies])]
    }

    repo: GirRepository
    ns: GirNamespace = { $: { name: '', version: '' } }
    /**
     * Used to find namespaces that are used in other modules
     */
    symTable: SymTable
    transformation: Transformation
    extends?: string
    log: Logger
    templateProcessor: TemplateProcessor

    /**
     * To prevent constants from being exported twice, the names already exported are saved here for comparison.
     * Please note: Such a case is only known for Zeitgeist-2.0 with the constant "ATTACHMENT"
     */
    constNames: { [varName: string]: ConstantDescription } = {}

    constructor(xml: ParsedGir, private readonly config: GenerateConfig) {
        this.repo = xml.repository

        if (!this.repo.namespace || !this.repo.namespace.length) {
            throw new Error(`Namespace not found!`)
        }

        this.dependencies = this.loadDependencies(this.repo.include || [])
        this.ns = this.repo.namespace[0]
        this.namespace = this.ns.$.name
        this.version = this.ns.$.version
        this.packageName = `${this.namespace}-${this.version}`
        this.transformation = new Transformation(this.packageName, config)
        this.log = new Logger(config.environment, config.verbose, this.packageName || 'GirModule')
        this.importName = this.transformation.transformModuleNamespaceName(this.packageName)

        this.templateProcessor = new TemplateProcessor(
            {
                name: this.namespace,
                version: this.version,
                importName: this.importName,
            },
            this.packageName,
            this.config,
        )

        this.symTable = new SymTable(this.config, this.packageName, this.namespace)
    }

    private loadDependencies(girInclude: GirInclude[]): string[] {
        const dependencies: string[] = []
        for (const i of girInclude) {
            dependencies.unshift(`${i.$.name}-${i.$.version || ''}`)
        }

        return dependencies
    }

    private checkTransitiveDependencies(transitiveDependencies: string[]) {
        // Always pull in GObject-2.0, as we may need it for e.g. GObject-2.0.type
        if (this.packageName !== 'GObject-2.0') {
            if (!Utils.find(transitiveDependencies, (x) => x === 'GObject-2.0')) {
                transitiveDependencies.push('GObject-2.0')
            }
        }

        // Add missing dependencies
        if (this.packageName === 'UnityExtras-7.0') {
            if (!Utils.find(transitiveDependencies, (x) => x === 'Unity-7.0')) {
                transitiveDependencies.push('Unity-7.0')
            }
        }
        if (this.packageName === 'UnityExtras-6.0') {
            if (!Utils.find(transitiveDependencies, (x) => x === 'Unity-6.0')) {
                transitiveDependencies.push('Unity-6.0')
            }
        }
        if (this.packageName === 'GTop-2.0') {
            if (!Utils.find(transitiveDependencies, (x) => x === 'GLib-2.0')) {
                transitiveDependencies.push('GLib-2.0')
            }
        }

        return transitiveDependencies
    }

    private annotateFunctionArguments(
        girFunc: GirFunctionElement | GirConstructorElement | GirVirtualMethodElement,
    ): void {
        const funcName = girFunc._fullSymName
        if (funcName && girFunc.parameters) {
            for (const girParams of girFunc.parameters) {
                if (girParams.parameter) {
                    for (const girParam of girParams.parameter) {
                        girParam._module = this
                        if (girParam.$ && girParam.$.name) {
                            girParam._fullSymName = `${funcName}.${girParam.$.name}`
                        }
                    }
                }
            }
        }
    }

    private annotateFunctionReturn(
        girFunc: GirFunctionElement | GirConstructorElement | GirVirtualMethodElement,
    ): void {
        const retVals = girFunc['return-value']
        if (retVals && girFunc._fullSymName)
            for (const retVal of retVals) {
                retVal._module = this
                if (retVal.$ && retVal.$.name) {
                    retVal._fullSymName = `${girFunc._fullSymName}.${retVal.$.name}`
                }
            }
    }

    private annotateFunctions(
        girClass: GirClassElement | GirRecordElement | GirInterfaceElement | null,
        girFuncs: GirFunctionElement[] | GirConstructorElement[] | GirVirtualMethodElement[] | GirSignalElement[],
    ): void {
        if (Array.isArray(girFuncs))
            for (const girFunc of girFuncs) {
                if (girFunc?.$?.name) {
                    girFunc._class = girClass || undefined
                    const nsName = girClass ? girClass._fullSymName : this.namespace
                    if (nsName) girFunc._fullSymName = `${nsName}.${girFunc.$.name}`
                    this.annotateFunctionArguments(girFunc)
                    this.annotateFunctionReturn(girFunc)
                }
            }
    }

    private annotateVariables(
        girClass: GirClassElement | GirRecordElement | GirInterfaceElement | null,
        girVars?: GirPropertyElement[] | GirFieldElement[] | GirConstantElement[],
    ): void {
        if (girVars)
            for (const girVar of girVars) {
                const nsName = girClass ? girClass._fullSymName : this.namespace
                girVar._module = this
                girVar._class = girClass || undefined
                if (girVar.$ && girVar.$.name && nsName) {
                    girVar._fullSymName = `${nsName}.${girVar.$.name}`
                }
            }
    }

    private loadTypesInternal(
        girConstructs?:
            | GirBitfieldElement[]
            | GirCallbackElement[]
            | GirClassElement[]
            | GirConstantElement[]
            | GirEnumElement[]
            | GirFunctionElement[]
            | GirInterfaceElement[]
            | GirRecordElement[]
            | GirUnionElement[]
            | GirAliasElement[],
    ): void {
        if (girConstructs) {
            for (const girConstruct of girConstructs) {
                if (girConstruct?.$ && girConstruct.$.name) {
                    if ((girConstruct as GirCallableParamElement | GirFunctionElement).$.introspectable) {
                        if (
                            !this.girBool(
                                (girConstruct as GirCallableParamElement | GirFunctionElement).$.introspectable,
                                true,
                            )
                        )
                            continue
                    }
                    const symName = `${this.namespace}.${girConstruct.$.name}`
                    if (this.symTable.get(this.allDependencies, symName)) {
                        this.log.warn(`Duplicate symbol: ${symName}`)
                    }

                    girConstruct._module = this
                    girConstruct._fullSymName = symName
                    this.symTable.set(this.allDependencies, symName, girConstruct)
                }
            }
        }
    }

    public loadTypes(): void {
        this.loadTypesInternal(this.ns.bitfield)
        this.loadTypesInternal(this.ns.callback)
        this.loadTypesInternal(this.ns.class)
        this.loadTypesInternal(this.ns.constant)
        this.loadTypesInternal(this.ns.enumeration)
        this.loadTypesInternal(this.ns.function)
        this.loadTypesInternal(this.ns.interface)
        this.loadTypesInternal(this.ns.record)
        this.loadTypesInternal(this.ns.union)
        this.loadTypesInternal(this.ns.alias)

        if (this.ns.callback) for (const func of this.ns.callback) this.annotateFunctionArguments(func)

        const girClasses: Array<GirClassElement | GirRecordElement | GirInterfaceElement> = [
            ...(this.ns.class || []),
            ...(this.ns.record || []),
            ...(this.ns.interface || []),
        ]

        for (const girClass of girClasses) {
            girClass._module = this
            girClass._fullSymName = `${this.namespace}.${girClass.$.name}`

            const constructors = girClass.constructor instanceof Array ? girClass.constructor : []
            const signals: GirSignalElement[] =
                (girClass as GirClassElement | GirInterfaceElement).signal || girClass['glib:signal'] || []
            const functions = girClass.function || []
            const methods = girClass.method || []
            const vMethods: GirVirtualMethodElement[] = girClass['virtual-method'] || []
            const properties = girClass.property
            const fields = girClass.field

            this.annotateFunctions(girClass, constructors)
            this.annotateFunctions(girClass, functions)
            this.annotateFunctions(girClass, methods)
            this.annotateFunctions(girClass, vMethods)
            this.annotateFunctions(girClass, signals)
            this.annotateVariables(girClass, properties)
            this.annotateVariables(girClass, fields)
        }

        if (this.ns.function) this.annotateFunctions(null, this.ns.function)

        if (this.ns.constant) this.annotateVariables(null, this.ns.constant)

        // if (this.ns.)
        // props
    }

    public loadInheritance(inheritanceTable: InheritanceTable): void {
        // Class hierarchy
        for (const cls of this.ns.class ? this.ns.class : []) {
            let parent: string | null = null
            if (cls.$ && cls.$.parent) parent = cls.$.parent
            if (!parent) continue
            if (!cls._fullSymName) continue

            if (parent.indexOf('.') < 0) {
                parent = this.namespace + '.' + parent
            }
            const clsName = cls._fullSymName

            const arr: string[] = inheritanceTable[clsName] || []
            arr.push(parent)
            inheritanceTable[clsName] = arr
        }

        // Class interface implementations
        for (const cls of this.ns.class ? this.ns.class : []) {
            if (!cls._fullSymName) continue

            const names: string[] = []

            for (const i of cls.implements ? cls.implements : []) {
                if (i.$.name) {
                    let name: string = i.$.name
                    if (name.indexOf('.') < 0) {
                        name = cls._fullSymName.substring(0, cls._fullSymName.indexOf('.') + 1) + name
                    }
                    names.push(name)
                }
            }

            if (names.length > 0) {
                const clsName = cls._fullSymName
                const arr: string[] = inheritanceTable[clsName] || []
                inheritanceTable[clsName] = arr.concat(names)
            }
        }
    }

    private fullTypeLookupWithNamespace(fullTypeName: string) {
        let resValue = ''
        let namespace = ''

        // Check overwrites first
        if (!resValue && fullTypeName && FULL_TYPE_MAP(this.config.environment, this.packageName, fullTypeName)) {
            resValue = FULL_TYPE_MAP(this.config.environment, this.packageName, fullTypeName) || ''
        }

        // Only use the fullTypeName as the type if it is found in the symTable
        if (!resValue && this.symTable.get(this.allDependencies, fullTypeName)) {
            if (fullTypeName.startsWith(this.namespace + '.')) {
                resValue = fullTypeName.substring(this.namespace.length + 1)
                resValue = this.transformation.transformTypeName(resValue)
                // TODO check if resValue this is a class, enum, interface or unify the transformClassName method
                resValue = this.transformation.transformClassName(resValue)
                namespace = this.namespace
            } else {
                const resValues = fullTypeName.split('.')
                resValues.map((name) => this.transformation.transformTypeName(name))
                // TODO check if resValues[resValues.length - 1] this is a class, enum, interface or unify the transformClassName method
                resValues[resValues.length - 1] = this.transformation.transformClassName(
                    resValues[resValues.length - 1],
                )
                resValue = resValues.join('.')
                namespace = resValues[0]
            }
        }

        return {
            value: resValue,
            namespace,
        }
    }

    private fullTypeLookup(girVar: GirCallableParamElement, fullTypeName: string | null) {
        let resValue = ''
        let namespace = ''

        if (!fullTypeName) {
            return {
                value: resValue,
                fullTypeName,
                namespace,
            }
        }

        // Fully qualify our type name if need be
        if (!fullTypeName.includes('.')) {
            let tryFullTypeName = ``

            if (!resValue && girVar._module && girVar._module !== this) {
                tryFullTypeName = `${girVar._module.namespace}.${fullTypeName}`
                resValue = this.fullTypeLookupWithNamespace(tryFullTypeName).value
                if (resValue) {
                    fullTypeName = tryFullTypeName
                    namespace = girVar._module.namespace
                }
            }

            if (!resValue) {
                tryFullTypeName = `${this.namespace}.${fullTypeName}`
                resValue = this.fullTypeLookupWithNamespace(tryFullTypeName).value
                if (resValue) {
                    fullTypeName = tryFullTypeName
                    namespace = this.namespace
                }
            }

            if (!resValue && girVar._class?._module?.namespace && girVar._class._module !== this) {
                tryFullTypeName = `${girVar._class._module.namespace}.${fullTypeName}`
                resValue = this.fullTypeLookupWithNamespace(tryFullTypeName).value
                if (resValue) {
                    fullTypeName = tryFullTypeName
                    namespace = girVar._class?._module?.namespace
                }
            }
        }

        if (!resValue && fullTypeName) {
            resValue = this.fullTypeLookupWithNamespace(fullTypeName).value
        }

        return {
            value: resValue,
            fullTypeName,
            namespace,
        }
    }

    private typeLookup(girVar: GirCallableParamElement | GirCallableReturn | GirAliasElement | GirFieldElement) {
        let type: GirType | null = null
        let fullTypeName: string | null = null
        let arr: TypeArraySuffix = ''
        let arrCType: string | undefined
        let nul: TypeNullableSuffix = ''
        let resValue = ''
        let namespace = ''
        let isFunction = false

        const collection = (girVar as GirCallableParamElement | GirCallableReturn).array
            ? (girVar as GirCallableParamElement | GirCallableReturn).array
            : girVar.type && /^GLib.S?List$/.test(girVar.type[0].$?.name || '')
            ? (girVar.type as GirArrayType[])
            : undefined

        if (collection && collection.length > 0) {
            const typeArray = collection[0].type
            if (collection[0].$) {
                const ea = collection[0].$
                arrCType = ea['c:type']
            }
            if (typeArray && typeArray.length > 0) {
                type = typeArray[0]
            }
            arr = '[]'
        } else if (girVar.type) {
            type = girVar.type[0]
        }

        if (girVar.$) {
            const nullable = this.paramIsNullable(girVar)
            if (nullable) {
                nul = ' | null'
            }
        }

        const suffix: TypeSuffix = (arr + nul) as TypeSuffix
        const cType = type?.$ ? type.$['c:type'] : arrCType
        fullTypeName = type?.$?.name || null
        const callbacks = (girVar as GirFieldElement).callback

        if (!resValue && callbacks?.length) {
            if (callbacks.length > 1) {
                // TODO
                this.log.warn('Ignore multiple callbacks!', callbacks)
            }
            const { desc } = this.getFunction(callbacks[0], '', '', undefined, true)
            if (desc.length) {
                if (desc.length > 1) {
                    this.log.warn('Ignore multiline function description!', desc)
                }
                fullTypeName = desc[0]
                isFunction = true
            }

            if (fullTypeName) {
                if (suffix.length) fullTypeName = '(' + fullTypeName + ')'
                resValue = fullTypeName
                isFunction = true
            }
        }

        if (!isFunction) {
            const res = this.fullTypeLookup(girVar, fullTypeName)
            if (res.value) {
                resValue = res.value
                fullTypeName = res.fullTypeName
                namespace = res.namespace
            }
        }

        if (!resValue && type?.$ && arr && type.$.name && POD_TYPE_MAP_ARRAY(this.config.environment)[type.$.name]) {
            resValue = POD_TYPE_MAP_ARRAY(this.config.environment)[type.$.name]
        }

        if (!resValue && type?.$ && type.$.name && POD_TYPE_MAP[type.$.name]) {
            resValue = POD_TYPE_MAP[type.$.name]
        }

        if (!resValue && cType && C_TYPE_MAP(cType)) {
            resValue = C_TYPE_MAP(cType) || ''
        }

        if (!resValue && cType && POD_TYPE_MAP[cType]) {
            resValue = POD_TYPE_MAP[cType]
        }

        if (!resValue) {
            resValue = 'any'
            this.log.warn(`Could not find type for '${fullTypeName || ''} ${girVar.$.name || ''} ${cType || ''}'`)
        }

        return {
            result: resValue + suffix,
            value: resValue,
            suffix,
            fullTypeName,
            namespace,
        }
    }

    private girBool(e: string | undefined, defaultVal = false): boolean {
        if (e) {
            if (parseInt(e) === 0) return false
            return true
        }
        return defaultVal
    }

    private getReturnType(girFunc: GirFunctionElement | GirConstructorElement): [string, number] {
        let returnType = 'void'
        let outArrayLengthIndex = -1

        const girVar = girFunc['return-value'] ? girFunc['return-value'][0] : null
        if (girVar) {
            returnType = this.typeLookup(girVar).result
            outArrayLengthIndex = girVar.array && girVar.array[0].$?.length ? Number(girVar.array[0].$.length) : -1
        }

        return [returnType, outArrayLengthIndex] as [string, number]
    }

    private arrayLengthIndexLookup(girVar: GirCallableParamElement): number {
        if (!girVar.array) return -1

        const arr: GirArrayType = girVar.array[0]
        if (!arr.$) return -1

        if (arr.$.length) {
            return parseInt(arr.$.length)
        }

        return -1
    }

    private closureDataIndexLookup(girVar: GirCallableParamElement): number {
        if (!girVar.$.closure) return -1

        return parseInt(girVar.$.closure)
    }

    private destroyDataIndexLookup(girVar: GirCallableParamElement): number {
        if (!girVar.$.destroy) return -1

        return parseInt(girVar.$.destroy)
    }

    private processParams(
        girVars: GirCallableParamElement[],
        skip: GirCallableParamElement[],
        getIndex: (param: GirCallableParamElement) => number,
    ): void {
        for (const param of girVars) {
            const index = getIndex(param)
            if (index < 0) continue
            if (index >= girVars.length) continue
            skip.push(girVars[index])
        }
    }

    /**
     * Checks if the parameter is nullable or optional.
     * TODO Check if it makes sense to split this in `paramIsNullable` and `paramIsOptional`
     *
     * @param param Param to test
     *
     * @author realh
     * @see https://github.com/realh/ts-for-gjs/commit/e4bdba8d4ca279dfa4abbca413eaae6ecc6a81f8
     */
    private paramIsNullable(girVar: GirCallableParamElement): boolean {
        const a = girVar.$
        return a && (this.girBool(a.nullable) || this.girBool(a['allow-none']) || this.girBool(a.optional))
    }

    private getParameters(outArrayLengthIndex: number, girParams?: GirCallableParams[]): [string, string[]] {
        const def: string[] = []
        const outParams: string[] = []

        if (girParams && girParams.length > 0) {
            const params = girParams[0]?.parameter || []
            // Instance parameter needs to be exposed for class methods (see comment above getClassMethods())
            const instanceParameter = girParams[0]['instance-parameter']
            if (instanceParameter && instanceParameter[0]) {
                const typeName = instanceParameter[0].type ? instanceParameter[0].type[0].$?.name : undefined
                const rec = typeName ? this.ns.record?.find((r) => r.$.name == typeName) : undefined
                const structFor = rec?.$['glib:is-gtype-struct-for']
                const gobject = this.namespace === 'GObject' || this.namespace === 'GLib' ? '' : 'GObject.'
                if (structFor && instanceParameter[0].$.name) {
                    // TODO: Should use of a constructor, and even of an instance, be discouraged?
                    def.push(`${instanceParameter[0].$.name}: ${structFor} | Function | ${gobject}Type`)
                }
            }
            if (params.length) {
                const skip = outArrayLengthIndex === -1 ? [] : [params[outArrayLengthIndex]]

                this.processParams(params, skip, (girVar) => this.arrayLengthIndexLookup(girVar))
                this.processParams(params, skip, (girVar) => this.closureDataIndexLookup(girVar))
                this.processParams(params, skip, (girVar) => this.destroyDataIndexLookup(girVar))

                for (const param of params) {
                    if (skip.indexOf(param) !== -1) {
                        continue
                    }
                    const paramName = this.transformation.transformParameterName(param.$.name || '-', false)
                    const optDirection = param.$.direction
                    const out = optDirection === 'out' || optDirection == 'inout'
                    // I think it's safest to force inout params to have the
                    // same type for in and out
                    const paramType = this.typeLookup(param).result

                    if (out) {
                        if (this.config.environment === 'gjs') {
                            outParams.push(`/* ${paramName} */ ${paramType}`)
                        } else if (this.config.environment === 'node') {
                            outParams.push(`${paramName}: ${paramType}`)
                        }

                        if (optDirection == 'out') continue
                    }

                    let isOptional = this.paramIsNullable(param) ? '?' : ''

                    if (isOptional === '?') {
                        const index = params.indexOf(param)
                        const following = params
                            .slice(index)
                            .filter(() => skip.indexOf(param) === -1)
                            .filter((p) => p.$.direction !== 'out')

                        if (following.some((p) => !this.paramIsNullable(p))) {
                            isOptional = ''
                        }
                    }

                    const paramDesc = `${paramName}${isOptional}: ${paramType}`
                    def.push(paramDesc)
                }
            }
        }

        return [def.join(', '), outParams]
    }

    private getVariable(
        girVar: GirCallableParamElement | GirFieldElement | GirConstantElement,
        optional = false,
        allowQuotes = false,
        type: 'property' | 'constant' | 'field',
    ): FunctionDescription {
        if (!girVar.$.name) return FALSY_FUNCTION_DESCRIPTION
        if (
            !girVar ||
            !girVar.$ ||
            !this.girBool(girVar.$.introspectable, true) ||
            this.girBool((girVar as GirFieldElement).$.private)
        )
            return FALSY_FUNCTION_DESCRIPTION

        let name = girVar.$.name

        switch (type) {
            case 'property':
                name = this.transformation.transformPropertyName(girVar.$.name, allowQuotes)
                break
            case 'constant':
                name = this.transformation.transformConstantName(girVar.$.name, allowQuotes)
                break
            case 'field':
                name = this.transformation.transformFieldName(girVar.$.name, allowQuotes)
                break
        }
        // Use the out type because it can be a union which isn't appropriate
        // for a property
        let typeName = this.typeLookup(girVar).result
        const nameSuffix = optional ? '?' : ''

        typeName = this.transformation.transformTypeName(typeName)
        const desc: VarDesc = [`${name}${nameSuffix}: ${typeName}`]

        return { desc, name, patched: false }
    }

    /**
     * @param girVar
     * @param indent
     * @param construct construct means include the property even if it's construct-only,
     * @param optional optional means if it's construct-only it will also be marked optional (?)
     */
    private getProperty(
        girProp: GirPropertyElement | GirFieldElement,
        indent = '',
        construct = false,
        optional = true,
    ): PropertyDescription {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (this.girBool(girProp.$['construct-only']) && !construct) return FALSY_PROPERTY_DESCRIPTION
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (!this.girBool(girProp.$.writable) && construct) return FALSY_PROPERTY_DESCRIPTION
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (this.girBool((girProp as GirFieldElement).$.private)) return FALSY_PROPERTY_DESCRIPTION

        const propPrefix = this.girBool(girProp.$.writable) ? '' : 'readonly '
        const {
            desc: propDesc,
            name: propName,
            patched,
        } = this.getVariable(girProp, construct && optional, true, 'property')
        let origName: string | null = null

        if (!propName) return FALSY_PROPERTY_DESCRIPTION

        if (girProp.$.name) {
            // TODO does that make sense here? This also changes the signal names
            origName = this.transformation.transformTypeName(girProp.$.name)
        }

        return {
            desc: [`${indent}${propPrefix}${propDesc[0]}`],
            propName,
            origName,
            patched,
        }
    }

    /**
     * Get the patches for a given namespace path, type and package name (including the version number)
     * @param packageName E.g. 'Gtk-3.0'
     * @param type E.g 'methods'
     * @param nsPath E.g. 'Gtk.MenuItem.activate'
     */
    private getPatches(packageName: string, type: 'methods' | 'constructorProperties', nsPath: string) {
        const packagePatches = typePatches[packageName]
        if (!packagePatches) {
            return undefined
        }

        const typePatch = packagePatches[type]
        if (!typePatch) {
            return undefined
        }

        return typePatch?.[nsPath] || undefined
    }

    /**
     *
     * @param e
     * @param indent
     * @param funcNamePrefix E.g. vfunc
     * @param overrideReturnType
     * @param arrowType
     */
    private getFunction(
        girFunc: GirFunctionElement | GirCallbackElement | GirConstructorElement,
        indent = '',
        funcNamePrefix = '',
        overrideReturnType?: string,
        arrowType = false,
    ): FunctionDescription {
        if (!girFunc || !girFunc.$ || !this.girBool(girFunc.$.introspectable, true) || girFunc.$['shadowed-by']) {
            return FALSY_FUNCTION_DESCRIPTION
        }
        const packageNameToPatch =
            girFunc._class?._module?.packageName || girFunc._module?.packageName || this.packageName
        const methodPatches = girFunc._fullSymName
            ? this.getPatches(packageNameToPatch, 'methods', girFunc._fullSymName)
            : []

        let name = girFunc.$.name
        // eslint-disable-next-line prefer-const
        let [retType, outArrayLengthIndex] = this.getReturnType(girFunc)

        const [params, outParams] = this.getParameters(outArrayLengthIndex, girFunc.parameters)

        if (girFunc.$['shadows']) {
            name = girFunc.$['shadows']
        }

        if (funcNamePrefix) name = funcNamePrefix + name

        // Function name transformation by environment
        name = this.transformation.transformFunctionName(name)

        if (methodPatches?.length) {
            this.log.warn(`Patch found for method ${girFunc._fullSymName}`)
            let desc: string[] = []
            if (methodPatches.length === 1) {
                desc = methodPatches.map((patch) => indent + patch)
            }
            if (methodPatches.length >= 2) {
                for (const [i, patchLine] of methodPatches.entries()) {
                    let descLine = ''
                    if (i === 1) {
                        descLine = `${indent}${funcNamePrefix}${patchLine}`
                    } else {
                        descLine = `${indent}${patchLine}`
                    }
                    desc.push(descLine)
                }
            }
            return {
                patched: true,
                desc: desc,
                name,
            }
        }

        const retTypeIsVoid = retType === 'void'

        // TODO move gjs / node differences logic to transformation.ts
        if (this.config.environment === 'gjs') {
            if (overrideReturnType) {
                retType = overrideReturnType
            } else if (outParams.length + (retTypeIsVoid ? 0 : 1) > 1) {
                if (!retTypeIsVoid) {
                    outParams.unshift(`/* returnType */ ${retType}`)
                }
                const retDesc = outParams.join(', ')
                retType = `[ ${retDesc} ]`
            } else if (outParams.length === 1 && retTypeIsVoid) {
                retType = outParams[0]
            }
        }
        // See point 6 on https://github.com/sammydre/ts-for-gjs/issues/21
        if (this.config.environment === 'node') {
            if (overrideReturnType) {
                retType = overrideReturnType
            } else if (outParams.length >= 1) {
                if (!retTypeIsVoid) {
                    outParams.unshift(`returnType: ${retType}`)
                }
                const retDesc = outParams.join(', ')
                retType = `{ ${retDesc} }`
            }
        }

        let retSep: string
        if (arrowType) {
            indent = ''
            name = ''
            retSep = ' =>'
        } else {
            retSep = ':'
        }

        return {
            patched: false,
            desc: [`${indent}${name}(${params})${retSep} ${retType}`],
            name,
        }
    }

    private getConstructorFunction(
        name: string,
        girConstFunc: GirConstructorElement,
        indent: string,
        funcNamePrefix = '',
    ): FunctionDescription {
        // eslint-disable-next-line prefer-const
        let { desc, name: funcName, patched } = this.getFunction(girConstFunc, indent, funcNamePrefix, name)

        if (!funcName) {
            return FALSY_FUNCTION_DESCRIPTION
        }

        return { desc, name: funcName, patched }
    }

    private getSignalFunc(girSignalFunc: GirSignalElement, clsName: string): string[] {
        const sigName = this.transformation.transform('signalName', girSignalFunc.$.name)
        const [retType, outArrayLengthIndex] = this.getReturnType(girSignalFunc)
        const [params] = this.getParameters(outArrayLengthIndex, girSignalFunc.parameters)
        const paramComma = params.length > 0 ? ', ' : ''

        return TemplateProcessor.generateSignalMethods(
            this.config.environment,
            sigName,
            clsName,
            paramComma,
            params,
            retType,
        )
    }

    private getDependencyByNamespace(namespace: string) {
        const packageName = this.allDependencies.find((dependency) => dependency.startsWith(namespace + '-'))
        return packageName
    }

    /**
     * Get girModule by namespace of the current dependencies
     * @param namespace
     */
    private getModuleByNamespace(namespace: string) {
        const packageName = this.getDependencyByNamespace(namespace)
        GirModule.allGirModules.find((girModule) => girModule.packageName === packageName)
    }

    private traverseInheritanceTree(
        girClass: GirClassElement | GirUnionElement | GirInterfaceElement,
        callback: (girClass: GirClassElement | GirUnionElement | GirInterfaceElement) => void,
        depth = 0,
        recursive = true,
    ): void {
        const details = this.getClassDetails(girClass)
        if (!details || !girClass.$.name) return
        const { parentName, qualifiedParentName } = details

        let parentPtr: GirClassElement | GirUnionElement | GirInterfaceElement | null = null
        let name = girClass.$.name

        if (name.indexOf('.') < 0) {
            name = this.namespace + '.' + name
        }

        if (parentName && qualifiedParentName) {
            if (this.symTable.get(this.allDependencies, qualifiedParentName)) {
                parentPtr = (this.symTable.get(this.allDependencies, qualifiedParentName) as GirClassElement) || null
            }

            if (!parentPtr && parentName == 'Object') {
                parentPtr = (this.symTable.getByHand('GObject-2.0.GObject.Object') as GirClassElement) || null
            }
        }

        callback(girClass)

        if (depth >= MAXIMUM_RECURSION_DEPTH) {
            this.log.warn(`Maximum recursion depth of ${MAXIMUM_RECURSION_DEPTH} reached for "${girClass.$.name}"`)
        } else {
            if (parentPtr && recursive && depth <= MAXIMUM_RECURSION_DEPTH) {
                this.traverseInheritanceTree(parentPtr, callback, ++depth, recursive)
            }
        }
    }

    private forEachInterface(
        girInterface: GirInterfaceElement | GirClassElement | GirUnionElement,
        callback: (cls: GirInterfaceElement | GirClassElement | GirUnionElement) => void,
        recurseObjects = false,
        dups = {},
    ): void {
        for (const { $ } of (girInterface as GirInterfaceElement).implements || []) {
            let name = $.name

            if (name.indexOf('.') < 0) {
                name = this.namespace + '.' + name
            }
            if (Object.prototype.hasOwnProperty.call(dups, name)) {
                continue
            }
            const key = this.symTable.getKey(this.allDependencies, name)
            let iface: GirInterfaceElement | null = null
            const _iface = this.symTable.get(this.allDependencies, name)
            if (key && (_iface as GirInterfaceElement)?.prerequisite) {
                dups[key] = true
                iface = _iface as GirInterfaceElement
            }

            if (iface) {
                callback(iface)
                this.forEachInterface(iface, callback, recurseObjects, dups)
            }
        }
        if ((girInterface as GirInterfaceElement).prerequisite) {
            let parentName = (girInterface as GirInterfaceElement).prerequisite?.[0].$.name
            if (!parentName) {
                return
            }
            if (parentName.indexOf('.') < 0) {
                parentName = this.namespace + '.' + parentName
            }
            if (Object.prototype.hasOwnProperty.call(dups, parentName)) return
            const parentPtr = this.symTable.get(this.allDependencies, parentName)
            if (parentPtr && ((parentPtr as GirInterfaceElement).prerequisite || recurseObjects)) {
                // iface's prerequisite is also an interface, or it's
                // a class and we also want to recurse classes
                callback(parentPtr as GirInterfaceElement)
                this.forEachInterface(parentPtr as GirInterfaceElement, callback, recurseObjects, dups)
            }
        }
    }

    private forEachInterfaceAndSelf(
        e: GirClassElement | GirUnionElement | GirInterfaceElement,
        callback: (cls: GirClassElement | GirUnionElement | GirInterfaceElement) => void,
    ) {
        callback(e)
        this.forEachInterface(e, callback)
    }

    private isDerivedFromGObject(girClass: GirClassElement | GirUnionElement | GirInterfaceElement): boolean {
        let ret = false
        this.traverseInheritanceTree(girClass, (cls) => {
            if (cls._fullSymName === 'GObject.Object') {
                ret = true
            }
        })
        return ret
    }

    /**
     *
     * @param desc
     * @param name
     * @param localNames Can be (constructor) properties, fields or methods
     * @param type
     */
    private checkOrSetLocalName(
        desc: VarDesc,
        name: string | null,
        localNames: LocalNames,
        type: LocalNameType,
    ): LocalNameCheck {
        if (!desc || !desc.length) {
            return FALSY_LOCAL_NAME_CHECK
        }

        if (!name) {
            // this.log.error(`No name for ${desc}`)
            return FALSY_LOCAL_NAME_CHECK
        }

        let isOverloadable = false

        // Methods are overloadable by typescript
        // TODO Add support for properties
        if (type === 'method') {
            isOverloadable = true
        }

        // If name is found in localNames this variable was already defined
        if (localNames[name] && localNames[name].desc) {
            // Ignore duplicates with the same type
            // TODO should we use `this.functionSignaturesMatch` here?
            if (Utils.isEqual(localNames[name].desc, desc)) {
                return FALSY_LOCAL_NAME_CHECK
            }

            // Ignore if current method is not overloadable
            if (!isOverloadable) {
                return FALSY_LOCAL_NAME_CHECK
            }

            // Only names of the same type are overloadable
            if (localNames[name].type !== type) {
                // This can be happen on node bindings, e.g. on `WebKit2.WebView.isLoading` and `WebKit2.WebView.isLoading()`
                // See issue https://github.com/romgrk/node-gtk/issues/256
                // See Gjs doc https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#property-is_loading
                // TODO prefer functions over properties (Overwrite the properties with the functions if they have the same name)

                // this.log.warn(
                //     `Same name "${name}" with different type found:\nDefined: ${localNames[name].desc}\nCurrent: ${desc}\n`,
                // )

                return FALSY_LOCAL_NAME_CHECK
            }

            // this.log.debug(`Overload ${type} ${name}\nDefined: ${localNames[name].desc}\nCurrent: ${desc}\n`)
        }

        localNames[name] = localNames[name] || {}
        const localName: LocalName = {
            desc,
            type,
        }
        localNames[name] = localName
        return { desc, added: true }
    }

    private processFields(
        cls: GirClassElement | GirUnionElement | GirInterfaceElement,
        localNames: LocalNames,
    ): string[] {
        const def: string[] = []
        if (cls.field) {
            for (const field of cls.field) {
                const { desc, name } = this.getVariable(field, false, false, 'field')

                const { desc: aDesc, added } = this.checkOrSetLocalName(desc, name, localNames, 'field')
                if (added) {
                    for (const curDesc of aDesc) {
                        def.push(`    ${curDesc}`)
                    }
                }
            }
        }
        if (def.length && cls._fullSymName) {
            const versionPrefix = cls._module?.packageName ? cls._module?.packageName + '.' : ''
            def.unshift(`    /* Fields of ${versionPrefix}${cls._fullSymName} */`)
        }
        return def
    }

    private processProperties(
        cls: GirClassElement | GirUnionElement | GirInterfaceElement,
        localNames: LocalNames,
        propertyNames: string[],
    ): string[] {
        const def: string[] = []
        const properties = (cls as GirClassElement | GirInterfaceElement).property
        if (properties) {
            for (const prop of properties) {
                const { desc, propName, origName } = this.getProperty(prop)
                const { desc: aDesc, added } = this.checkOrSetLocalName(desc, propName, localNames, 'property')
                if (added) {
                    if (origName) propertyNames.push(origName)
                    for (const curDesc of aDesc) {
                        def.push(`    ${curDesc}`)
                    }
                }
            }
        }
        if (def.length && cls._fullSymName) {
            const versionPrefix = cls._module?.packageName ? cls._module?.packageName + '.' : ''
            def.unshift(`    /* Properties of ${versionPrefix}${cls._fullSymName} */`)
        }
        return def
    }

    /**
     * Instance methods
     * @param cls
     * @param localNames
     */
    private processMethods(
        cls: GirClassElement | GirUnionElement | GirInterfaceElement,
        localNames: LocalNames,
    ): string[] {
        const def: string[] = []
        if (cls.method) {
            for (const func of cls.method) {
                const { desc, name } = this.getFunction(func)
                const { desc: aDesc, added } = this.checkOrSetLocalName(desc, name, localNames, 'method')
                if (added) {
                    for (const curDesc of aDesc) {
                        def.push(`    ${curDesc}`)
                    }
                }
            }
        }
        if (def.length && cls._fullSymName) {
            const versionPrefix = cls._module?.packageName ? cls._module?.packageName + '.' : ''
            def.unshift(`    /* Methods of ${versionPrefix}${cls._fullSymName} */`)
        }
        return def
    }

    private exportOverloadableMethods(fnMap: FunctionMap, explicits: Set<string>) {
        const def: string[] = []
        for (const k of Array.from(explicits.values())) {
            const f = fnMap.get(k)
            if (f) def.push(...f)
        }
        return def
    }

    /**
     * Instance methods, vfunc_ prefix
     * @param cls
     */
    private processVirtualMethods(cls: GirClassElement | GirUnionElement | GirInterfaceElement): string[] {
        // Virtual methods currently not supported in node-gtk
        // See point 4 on https://github.com/sammydre/ts-for-gjs/issues/21
        if (this.config.environment === 'node') {
            return []
        }
        const [fnMap, explicits] = this.processOverloadableMethods(cls, (e) => {
            const vMethods: GirVirtualMethodElement[] = e['virtual-method'] || []
            let methods = vMethods.map((virtualFunc) => {
                const func = this.getFunction(virtualFunc, '    ', 'vfunc_')
                return func
            })
            methods = methods.filter((f) => f.name !== null)
            return methods
        })
        const def = this.exportOverloadableMethods(fnMap, explicits)
        if (def.length && cls._fullSymName) {
            const versionPrefix = cls._module?.packageName ? cls._module?.packageName + '.' : ''
            def.unshift(`    /* Virtual methods of ${versionPrefix}${cls._fullSymName} */`)
        }
        return def
    }

    private processSignals(cls: GirClassElement | GirInterfaceElement | GirUnionElement, clsName: string): string[] {
        const def: string[] = []
        const signals: GirSignalElement[] =
            (cls as GirClassElement | GirInterfaceElement).signal || cls['glib:signal'] || []
        if (signals) {
            for (const signal of signals) def.push(...this.getSignalFunc(signal, clsName))
        }
        if (def.length && cls._fullSymName) {
            const versionPrefix = cls._module?.packageName ? cls._module?.packageName + '.' : ''
            def.unshift(`    /* Signals of ${versionPrefix}${cls._fullSymName} */`)
        }
        return def
    }

    private stripParamNames(func: string, ignoreTail = false): string {
        const g = func
        func = func.replace(COMMENT_REG_EXP, '')
        const lb = func.split('(', 2)
        if (lb.length < 2) this.log.error(`Bad function definition ${g}`)
        const rb = lb[1].split(')')
        const tail = ignoreTail ? '' : rb[rb.length - 1]
        let params = rb.slice(0, rb.length - 1).join(')')
        params = params.replace(PARAM_REG_EXP, ':')
        params = params.replace(OPT_PARAM_REG_EXP, '?:')
        return `${lb[0]}(${params})${tail}`
    }

    /**
     * Some classes implement interfaces which are also implemented by a superclass
     * and we need to exclude those in some circumstances
     * @param cls
     * @param iface
     */
    private interfaceIsDuplicate(
        cls: GirClassElement | GirInterfaceElement | GirUnionElement,
        iface: GirClassElement | GirUnionElement | GirInterfaceElement | string,
    ): boolean {
        if (typeof iface !== 'string') {
            if (!iface._fullSymName) return false
            iface = iface._fullSymName
        }
        let rpt = false
        let bottom = true
        this.traverseInheritanceTree(cls, (sub) => {
            if (rpt) return
            if (bottom) {
                bottom = false
                return
            }
            if ((sub as GirInterfaceElement).prerequisite) {
                this.forEachInterface(
                    sub,
                    (e) => {
                        if (rpt) return
                        if (e._fullSymName === iface) {
                            rpt = true
                        }
                    },
                    true,
                )
            }
        })
        return rpt
    }

    private getStaticConstructors(
        e: GirClassElement | GirInterfaceElement | GirUnionElement,
        name: string,
        filter?: (funcName: string) => boolean,
    ): FunctionDescription[] {
        const constructors = e['constructor']
        if (!Array.isArray(constructors)) {
            return []
        }
        let ctors = constructors.map((constructor) => {
            return this.getConstructorFunction(name, constructor, '    static ', undefined)
        })
        if (filter) ctors = ctors.filter(({ name: funcName }) => funcName && filter(funcName))
        return ctors
    }

    private isGtypeStructFor(e: GirClassElement | GirUnionElement | GirInterfaceElement, rec: GirRecordElement) {
        const isFor = rec.$['glib:is-gtype-struct-for']
        return isFor && isFor == e.$.name
    }

    /**
     * Some class/static methods are defined in a separate record which is not
     * exported, but the methods are available as members of the JS constructor.
     * In gjs one can use an instance of the object, a JS constructor or a GType
     * as the methods' instance-parameter.
     * @see https://discourse.gnome.org/t/using-class-methods-like-gtk-widget-class-get-css-name-from-gjs/4001
     * @param girClass
     */
    private getClassMethods(girClass: GirClassElement | GirUnionElement | GirInterfaceElement): FunctionDescription[] {
        if (!girClass.$.name) return []
        const fName = girClass.$.name + 'Class'
        let rec = this.ns.record?.find((r) => r.$.name == fName)
        if (!rec || !this.isGtypeStructFor(girClass, rec)) {
            rec = this.ns.record?.find((r) => this.isGtypeStructFor(girClass, r))
            fName == rec?.$.name
        }
        if (!rec) return []
        const methods = rec.method || []
        return methods.map((m) => this.getFunction(m, '    static '))
    }

    private getOtherStaticFunctions(
        girClass: GirClassElement | GirInterfaceElement | GirUnionElement,
        stat = true,
    ): FunctionDescription[] {
        const fns: FunctionDescription[] = []
        if (girClass.function) {
            for (const func of girClass.function) {
                const {
                    desc,
                    name: funcName,
                    patched,
                } = this.getFunction(func, stat ? '    static ' : '    ', undefined, undefined)
                if (funcName && funcName !== 'new') fns.push({ desc, name: funcName, patched })
            }
        }
        return fns
    }

    private getClassDetails(girClass: GirClassElement | GirUnionElement | GirInterfaceElement): ClassDetails | null {
        if (!girClass?.$?.name) return null
        const mod: GirModule = girClass._module ? girClass._module : this
        let className = this.transformation.transformClassName(girClass.$.name)
        /**
         * E.g. 'Gtk'
         */
        const namespace = mod.namespace
        /**
         * E.g. '3.0'
         */
        const version = mod.version
        let qualifiedName: string
        if (className.indexOf('.') < 0) {
            qualifiedName = namespace + '.' + className
        } else {
            qualifiedName = className
            const split = className.split('.')
            className = split[split.length - 1]
        }

        let parentName: string | undefined
        let qualifiedParentName: string | undefined
        let localParentName: string | undefined

        const prerequisiteName = (girClass as GirInterfaceElement)?.prerequisite?.[0]?.$?.name
        if (prerequisiteName) {
            parentName = prerequisiteName
        } else if ((girClass as GirClassElement).$.parent) {
            parentName = (girClass as GirClassElement).$.parent
        }

        let parentModName: string
        if (parentName) {
            if (parentName.indexOf('.') < 0) {
                qualifiedParentName = namespace + '.' + parentName
                parentModName = namespace
            } else {
                qualifiedParentName = parentName
                const split = parentName.split('.')
                parentName = split[split.length - 1]
                parentModName = split.slice(0, split.length - 1).join('.')
            }
            localParentName = parentModName == namespace ? parentName : qualifiedParentName
        }

        return { name: className, qualifiedName, parentName, qualifiedParentName, localParentName, namespace, version }
    }

    private isCommentLine(line: string) {
        const lineTrim = line.trim()
        return lineTrim.startsWith('//') || (lineTrim.startsWith('/*') && lineTrim.endsWith('*/'))
    }

    /**
     * Returns true if the function definitions in f1 and f2 have equivalent signatures
     * @param f1
     * @param f2
     */
    private functionSignaturesMatch(f1: string, f2: string) {
        if (this.isCommentLine(f1) || this.isCommentLine(f2)) return false
        return this.stripParamNames(f1) == this.stripParamNames(f2)
    }

    /**
     * See comment for addOverloadableFunctions.
     * Returns true if (a definition from) func is added to map to satisfy
     * an overload, but false if it was forced
     * @param map
     * @param func
     * @param force
     */
    private mergeOverloadableFunctions(map: FunctionMap, func: FunctionDescription, force = true) {
        if (!func.name) return false
        const defs = map.get(func.name)
        if (!defs) {
            if (force) map.set(func.name, func.desc)
            return false
        }
        let result = false
        for (const newDef of func.desc) {
            let match = false
            for (const oldDef of defs) {
                if (this.functionSignaturesMatch(newDef, oldDef)) {
                    match = true
                    break
                }
            }
            if (!match) {
                defs.push(newDef)
                result = true
            }
        }
        return result
    }

    /**
     * fnMap values are equivalent to the second element of a FunctionDescription.
     * If an entry in fnMap is changed its name is added to explicits (set of names which must be declared).
     * If force is true, every function of f2 is added to fnMap and overloads even
     * if it doesn't already contain a function of the same name.
     * @param fnMap
     * @param explicits
     * @param funcs
     * @param force
     */
    private addOverloadableFunctions(
        fnMap: FunctionMap,
        explicits: Set<string>,
        funcs: FunctionDescription[],
        force = false,
    ) {
        for (const func of funcs) {
            if (!func.name) continue
            if (this.mergeOverloadableFunctions(fnMap, func) || force) {
                explicits.add(func.name)
            }
        }
    }

    /**
     * Used for <method> and <virtual-method>
     * @param cls
     * @param getMethods
     * @param statics
     */
    private processOverloadableMethods(
        cls: GirClassElement | GirInterfaceElement | GirUnionElement,
        getMethods: (e: GirClassElement | GirInterfaceElement | GirUnionElement) => FunctionDescription[],
        statics = false,
    ): [FunctionMap, Set<string>] {
        const fnMap: FunctionMap = new Map()
        const explicits = new Set<string>()
        const funcs = getMethods(cls)
        this.addOverloadableFunctions(fnMap, explicits, funcs, true)
        // Have to implement methods from cls' interfaces
        this.forEachInterface(
            cls,
            (iface) => {
                if (!this.interfaceIsDuplicate(cls, iface)) {
                    const funcs = getMethods(iface)
                    this.addOverloadableFunctions(fnMap, explicits, funcs, true)
                }
            },
            false,
        )
        // Check for overloads among all inherited methods
        let bottom = true
        this.traverseInheritanceTree(cls, (e) => {
            if (bottom) {
                bottom = false
                return
            }
            if (statics) {
                const funcs = getMethods(e)
                this.addOverloadableFunctions(fnMap, explicits, funcs, false)
            } else {
                let self = true
                this.forEachInterfaceAndSelf(e, (iface) => {
                    if (self || this.interfaceIsDuplicate(cls, iface)) {
                        const funcs = getMethods(iface)
                        this.addOverloadableFunctions(fnMap, explicits, funcs, false)
                    }
                    self = false
                })
            }
        })
        return [fnMap, explicits]
    }

    private processStaticFunctions(
        cls: GirClassElement | GirInterfaceElement | GirUnionElement,
        getter: (e: GirClassElement | GirInterfaceElement | GirUnionElement) => FunctionDescription[],
    ): string[] {
        const [fnMap, explicits] = this.processOverloadableMethods(cls, getter, true)
        return this.exportOverloadableMethods(fnMap, explicits)
    }

    private generateSignalMethods(
        cls: GirClassElement | GirUnionElement | GirInterfaceElement,
        propertyNames: string[],
        callbackObjectName: string,
    ): string[] {
        const def: string[] = []
        const isDerivedFromGObject = this.isDerivedFromGObject(cls)
        if (isDerivedFromGObject) {
            let prefix = 'GObject.'
            if (this.namespace === 'GObject') prefix = ''
            for (const prop of propertyNames) {
                def.push(
                    ...TemplateProcessor.generateGObjectSignalMethods(
                        this.config.environment,
                        prop,
                        callbackObjectName,
                        prefix,
                    ),
                )
            }
            def.push(...TemplateProcessor.generateGeneralSignalMethods(this.config.environment))
        }
        return def
    }

    /**
     * Static methods, <constructor> and <function>
     * @param girClass
     * @param name
     */
    private getAllStaticFunctions(girClass: GirClassElement | GirInterfaceElement | GirUnionElement, name: string) {
        const stc: string[] = []

        stc.push(
            ...this.processStaticFunctions(girClass, (cls) => {
                return this.getStaticConstructors(cls, name)
            }),
        )
        stc.push(
            ...this.processStaticFunctions(girClass, (cls) => {
                return this.getOtherStaticFunctions(cls)
            }),
        )
        stc.push(
            ...this.processStaticFunctions(girClass, (cls) => {
                return this.getClassMethods(cls)
            }),
        )

        if (stc.length > 0) {
            stc.unshift('    /* Static methods and pseudo-constructors */')
        }
        return stc
    }

    private generateConstructorAndStaticMethods(
        girClass: GirClassElement | GirUnionElement | GirInterfaceElement,
        name: string,
    ): string[] {
        const def: string[] = []
        const isDerivedFromGObject = this.isDerivedFromGObject(girClass)
        if (girClass._fullSymName && !STATIC_NAME_ALREADY_EXISTS.includes(girClass._fullSymName)) {
            // Records, classes and interfaces all have a static name
            def.push(`    static name: string`)
        }

        // JS constructor(s)
        if (isDerivedFromGObject) {
            def.push(
                `    constructor (config?: ${name}_ConstructProps)`,
                `    _init (config?: ${name}_ConstructProps): void`,
            )
        } else {
            const constructor_: GirFunctionElement[] = (girClass['constructor'] || []) as GirFunctionElement[]
            if (constructor_) {
                if (Array.isArray(constructor_)) {
                    for (const f of constructor_) {
                        const { desc, name: funcName } = this.getConstructorFunction(name, f, '    static ')
                        if (!funcName) continue
                        if (funcName !== 'new') continue

                        def.push(...desc)

                        const jsStyleCtor = desc[0].replace('static new', 'constructor').replace(/:[^:]+$/, '')

                        def.push(jsStyleCtor)
                    }
                }
            }
        }

        def.push(...this.getAllStaticFunctions(girClass, name))

        if (isDerivedFromGObject) {
            def.push(`    static $gtype: ${this.packageName === 'GObject-2.0' ? '' : 'GObject.'}Type`)
        }

        return def
    }

    private addExport(def: string[], t: string, name: string, definition: string) {
        const exp = this.config.exportDefault ? '' : 'export '
        if (!definition.startsWith(':')) {
            definition = ' ' + definition
        }
        def.push(`${exp}${t} ${name}${definition}`)
    }

    private generateConstructPropsInterface(
        girClass: GirClassElement | GirUnionElement | GirInterfaceElement,
        name: string,
        qualifiedParentName?: string,
        localParentName?: string,
    ): string[] {
        const def: string[] = []
        const isDerivedFromGObject = this.isDerivedFromGObject(girClass)
        if (isDerivedFromGObject) {
            let ext = ' '

            if (qualifiedParentName && localParentName) {
                ext = `extends ${localParentName}_ConstructProps `
            }

            def.push(`export interface ${name}_ConstructProps ${ext}{`)
            const constructPropNames: LocalNames = {}
            const properties = (girClass as GirClassElement | GirInterfaceElement).property
            if (properties) {
                for (const property of properties) {
                    const { desc, propName } = this.getProperty(property, '', true, true)
                    const { desc: aDesc, added } = this.checkOrSetLocalName(
                        desc,
                        propName,
                        constructPropNames,
                        'property',
                    )

                    if (added) {
                        const packageNameToPatch =
                            property._class?._module?.packageName || property._module?.packageName || this.packageName
                        const constructPropPatches: VarDesc | undefined = property._fullSymName
                            ? this.getPatches(packageNameToPatch, 'constructorProperties', property._fullSymName)
                            : undefined

                        if (constructPropPatches?.length) {
                            this.log.warn(`Patch found for constructor property "${property._fullSymName}"!`)
                            for (const curDesc of constructPropPatches) {
                                def.push(`    ${curDesc}`)
                            }
                        } else {
                            for (const curDesc of aDesc) {
                                def.push(`    ${curDesc}`)
                            }
                        }
                    }
                }
            }
            // Include props of implemented interfaces
            if ((girClass as GirClassElement | GirInterfaceElement).implements) {
                this.forEachInterface(girClass, (iface) => {
                    const properties = (iface as GirClassElement | GirInterfaceElement).property
                    if (properties) {
                        for (const p of properties) {
                            const { desc, propName } = this.getProperty(p, '', true, true)
                            const { desc: aDesc, added } = this.checkOrSetLocalName(
                                desc,
                                propName,
                                constructPropNames,
                                'property',
                            )
                            if (added) {
                                for (const curDesc of aDesc) {
                                    def.push(`    ${curDesc}`)
                                }
                            }
                        }
                    }
                })
            }
            def.push('}')
        }
        return def
    }

    public exportEnumeration(e: GirEnumElement): string[] {
        const def: string[] = []

        if (!e || !e.$ || !this.girBool(e.$.introspectable, true)) return []

        let name = e.$.name
        // E.g. the NetworkManager-1.0 has enum names starting with 80211
        name = this.transformation.transformEnumName(name)

        this.addExport(def, 'enum', name, '{')
        if (e.member) {
            for (const member of e.member) {
                const _name = member.$.name || member.$['glib:nick'] || member.$['c:identifier']
                if (!_name) {
                    continue
                }
                const name = this.transformation.transform('enumValue', _name)
                if (/\d/.test(name[0])) def.push(`    /* ${name} (invalid, starts with a number) */`)
                else def.push(`    ${name},`)
            }
        }
        def.push('}')
        return def
    }

    public exportConstant(girVar: GirConstantElement): string[] {
        const { desc: varDesc, name: varName, patched } = this.getVariable(girVar, false, false, 'constant')
        if (varName) {
            if (!this.constNames[varName]) {
                this.constNames[varName] = {
                    desc: varDesc,
                    name: varName,
                    patched,
                }
                for (const desc of varDesc) {
                    return [`export const ${desc}`]
                }
            } else {
                this.log.warn(`The constant '${varDesc.join(', ')}' has already been exported`)
            }
        }
        return []
    }

    /**
     * Represents a record or GObject class or interface as a Typescript class
     * @param girClass
     * @param isAbstract
     * @param record
     */
    public exportClassInternal(
        girClass: GirClassElement | GirUnionElement | GirInterfaceElement,
        record = false,
        isAbstract = false,
    ): string[] {
        const def: string[] = []

        // Is this a abstract class? E.g GObject.ObjectClass is a such abstract class and required by UPowerGlib-1.0, UDisks-2.0 and others
        if (girClass.$ && girClass.$['glib:is-gtype-struct-for']) {
            isAbstract = true
        }

        const details = this.getClassDetails(girClass)
        if (!details) return []

        const { name, qualifiedParentName, localParentName } = details

        // Properties for construction
        def.push(...this.generateConstructPropsInterface(girClass, name, qualifiedParentName, localParentName))

        // START CLASS
        if (isAbstract) {
            this.addExport(def, 'abstract class', name, '{')
        } else {
            this.addExport(def, 'class', name, '{')
        }

        const localNames: LocalNames = {}
        const propertyNames: string[] = []

        // Can't export fields for GObjects because names would clash
        if (record) def.push(...this.processFields(girClass, localNames))

        // Copy properties from inheritance tree
        this.traverseInheritanceTree(girClass, (cls) =>
            def.push(...this.processProperties(cls, localNames, propertyNames)),
        )
        // Copy properties from implemented interface
        this.forEachInterface(girClass, (cls) => def.push(...this.processProperties(cls, localNames, propertyNames)))
        // Copy fields from inheritance tree
        this.traverseInheritanceTree(girClass, (cls) => def.push(...this.processFields(cls, localNames)))
        // Copy methods from inheritance tree
        this.traverseInheritanceTree(girClass, (cls) => def.push(...this.processMethods(cls, localNames)))
        // Copy methods from implemented interfaces
        this.forEachInterface(girClass, (cls) => def.push(...this.processMethods(cls, localNames)))
        // Copy virtual methods from inheritance tree
        this.traverseInheritanceTree(girClass, (cls) => def.push(...this.processVirtualMethods(cls)))
        // Copy signals from inheritance tree
        this.traverseInheritanceTree(girClass, (cls) => def.push(...this.processSignals(cls, name)))
        // Copy signals from implemented interfaces
        this.forEachInterface(girClass, (cls) => def.push(...this.processSignals(cls, name)))

        def.push(...this.generateSignalMethods(girClass, propertyNames, name))

        // TODO: Records have fields

        // Static side: default constructor
        def.push(...this.generateConstructorAndStaticMethods(girClass, name))

        // END CLASS
        def.push('}')

        return def
    }

    public exportFunction(e: GirFunctionElement): string[] {
        const exp = this.config.exportDefault ? '' : 'export '
        const { desc } = this.getFunction(e, exp + 'function ')
        return desc
    }

    public exportCallback(e: GirFunctionElement): string[] {
        if (!e || !e.$ || !this.girBool(e.$.introspectable, true)) return []

        const name = e.$.name
        const [retType, outArrayLengthIndex] = this.getReturnType(e)
        const [params] = this.getParameters(outArrayLengthIndex, e.parameters)

        const def: string[] = []
        this.addExport(def, 'interface', name, '{')
        def.push(`    (${params}): ${retType}`)
        def.push('}')
        return def
    }

    public exportAlias(girAlias: GirAliasElement): string[] {
        if (!girAlias || !girAlias.$ || !this.girBool(girAlias.$.introspectable, true)) return []

        const typeName = this.typeLookup(girAlias).result
        const name = girAlias.$.name
        const exp = this.config.exportDefault ? '' : 'export '
        return [`${exp}type ${name} = ${typeName}`]
    }

    public exportInterface(girClass: GirClassElement): string[] {
        return this.exportClassInternal(girClass, true)
    }

    public exportClass(girClass: GirClassElement): string[] {
        return this.exportClassInternal(girClass, false)
    }

    public async exportJs(): Promise<void> {
        const template = 'module.js'
        if (this.config.outdir) {
            await this.templateProcessor.create(template, this.config.outdir, `${this.packageName}.js`)
        } else {
            const moduleContent = this.templateProcessor.load(template)
            this.log.log(moduleContent)
        }
    }

    public async export(outStream: NodeJS.WritableStream, outputPath: string | null): Promise<void> {
        const out: string[] = []

        out.push(...TemplateProcessor.generateTSDocComment(`${this.packageName}`))

        out.push('')

        const deps: string[] = this.transitiveDependencies

        // Module dependencies as type references or imports
        if (this.config.environment === 'gjs') {
            out.push(...this.templateProcessor.generateModuleDependenciesImport('Gjs', 'Gjs', false, this.config))
        }

        for (const depPackageName of deps) {
            // Don't reference yourself as a dependency
            if (this.packageName !== depPackageName) {
                const girFilename = `${depPackageName}.gir`
                const { namespace } = Utils.splitModuleName(depPackageName)
                const depFile = Utils.findFileInDirs(this.config.girDirectories, girFilename)
                if (depFile.exists) {
                    out.push(
                        ...this.templateProcessor.generateModuleDependenciesImport(
                            namespace,
                            depPackageName,
                            false,
                            this.config,
                        ),
                    )
                } else {
                    out.push(`// WARN: Dependency not found: '${depPackageName}'`)
                    this.log.error(`Dependency gir file not found: '${girFilename}'`)
                }
            }
        }

        // START Namespace
        if (this.config.buildType === 'types') {
            out.push('')
            out.push(`export declare namespace ${this.namespace} {`)
        } else if (this.config.exportDefault) {
            out.push('')
            out.push(`export namespace ${this.namespace} {`)
        }

        // Newline
        out.push('')

        if (this.ns.enumeration)
            for (const enumeration of this.ns.enumeration) out.push(...this.exportEnumeration(enumeration))

        if (this.ns.bitfield) for (const bitfield of this.ns.bitfield) out.push(...this.exportEnumeration(bitfield))

        if (this.ns.constant) for (const constant of this.ns.constant) out.push(...this.exportConstant(constant))

        if (this.ns.function) for (const func of this.ns.function) out.push(...this.exportFunction(func))

        if (this.ns.callback) for (const cb of this.ns.callback) out.push(...this.exportCallback(cb))

        if (this.ns.interface) for (const iface of this.ns.interface) out.push(...this.exportClassInternal(iface))

        const templateProcessor = new TemplateProcessor(
            { name: this.namespace, version: this.version },
            this.packageName,
            this.config,
        )

        // Extra interfaces if a template with the module name  (e.g. '../templates/GObject-2.0.d.ts') is found
        // E.g. used for GObject-2.0 to help define GObject classes in js;
        // these aren't part of gi.
        if (templateProcessor.exists(`${this.packageName}.d.ts`)) {
            const templatePatches = await templateProcessor.load(`${this.packageName}.d.ts`)
            out.push(templatePatches)
        }

        if (this.ns.class) for (const cls of this.ns.class) out.push(...this.exportClassInternal(cls, false))

        if (this.ns.record) for (const record of this.ns.record) out.push(...this.exportClassInternal(record, true))

        if (this.ns.union) for (const union of this.ns.union) out.push(...this.exportClassInternal(union, true))

        if (this.ns.alias)
            // GType is not a number in GJS
            for (const e of this.ns.alias)
                if (this.packageName !== 'GObject-2.0' || e.$.name !== 'Type') out.push(...this.exportAlias(e))

        if (this.packageName === 'GObject-2.0') out.push('export interface Type {', '    name: string', '}')

        // END Namespace
        if (this.config.buildType === 'types' || this.config.exportDefault) {
            out.push(`}`)
        }

        if (this.config.buildType === 'types' || this.config.exportDefault) {
            out.push(`export default ${this.namespace};`)
        }

        // End of file
        outStream.write(out.join('\n'))

        if (outputPath && this.config.pretty) {
            await templateProcessor.prettify(outputPath)
        }
    }
}

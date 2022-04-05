import type { GirClassElement, GirRecordElement, GirUnionElement, GirInterfaceElement } from './types/index.js'

import { classes } from './injections/index.js'
import { GirFactory } from './gir-factory.js'

/**
 * Inject additional methods, properties, etc
 */
export class Injector {
    girFactory = new GirFactory()

    /** Inject additional methods, properties, etc to a existing class */
    toClass(girClass: GirClassElement | GirUnionElement | GirInterfaceElement | GirRecordElement) {
        if (!girClass._tsData) {
            return
        }

        const toClass = classes.find((cls) => cls.qualifiedName === girClass._tsData?.qualifiedName)
        if (toClass) {
            if (toClass.staticFunctions) {
                girClass._tsData.staticFunctions.push(...this.girFactory.newFunctions(toClass.staticFunctions))
            }
            if (toClass.constructors) {
                girClass._tsData.constructors.push(...this.girFactory.newFunctions(toClass.constructors))
            }
            if (toClass.methods) {
                girClass._tsData.methods.push(...this.girFactory.newFunctions(toClass.methods))
            }
            if (toClass.virtualMethods) {
                girClass._tsData.virtualMethods.push(...this.girFactory.newFunctions(toClass.virtualMethods))
            }
            if (toClass.propertyNames) {
                girClass._tsData.propertyNames.push(...toClass.propertyNames)
            }
            if (toClass.generics) {
                girClass._tsData.generics.push(...this.girFactory.newGenerics(toClass.generics))
            }
        }
    }
}

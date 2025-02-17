import { TypeExpression } from "../gir.js";
import { IntrospectedNamespaceMember, Options } from "./base.js";

import { GirAliasElement } from "../index.js";
import { IntrospectedNamespace, isIntrospectable } from "./namespace.js";
import { sanitizeIdentifierName, getAliasType, parseDoc, parseMetadata } from "./util.js";
import { FormatGenerator, GenericDescriptor } from "../generators/generator.js";
import { GirVisitor } from "../visitor.js";

import type { OptionsLoad } from "../types/index.js";

export class IntrospectedAlias extends IntrospectedNamespaceMember {
    readonly type: TypeExpression;
    readonly generics: GenericDescriptor[];

    constructor({
        namespace,
        name,
        type,
        generics = [],
        ...args
    }: Options<{
        namespace: IntrospectedNamespace;
        name: string;
        type: TypeExpression;
        generics?: GenericDescriptor[];
    }>) {
        super(name, namespace, { ...args });

        this.type = type;
        this.generics = generics;
    }

    accept(visitor: GirVisitor): IntrospectedAlias {
        const node = this.copy({
            type: visitor.visitType?.(this.type)
        });

        return visitor.visitAlias?.(node) ?? node;
    }

    copy(options?: { parent?: undefined; type?: TypeExpression }): IntrospectedAlias {
        const { name, namespace, type } = this;

        return new IntrospectedAlias({ name, namespace, type: options?.type ?? type })._copyBaseProperties(this);
    }

    asString<T extends FormatGenerator<unknown>>(generator: T): ReturnType<T["generateAlias"]> {
        return generator.generateAlias(this) as ReturnType<T["generateAlias"]>;
    }

    static fromXML(
        element: GirAliasElement,
        ns: IntrospectedNamespace,
        options: OptionsLoad
    ): IntrospectedAlias | null {
        if (!element.$.name) {
            console.error(`Alias in ${ns.namespace} lacks name.`);
            return null;
        }

        const alias = new IntrospectedAlias({
            namespace: ns,
            name: sanitizeIdentifierName(ns.namespace, element.$.name),
            type: getAliasType(ns.namespace, ns, element),
            isIntrospectable: isIntrospectable(element)
        });

        if (options.loadDocs) {
            alias.doc = parseDoc(element);
            alias.metadata = parseMetadata(element);
        }

        return alias;
    }
}

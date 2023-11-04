import { FormatGenerator } from "../generators/index.js";
import { LoadOptions } from "../types.js";
import { GirVisitor } from "../visitor.js";
import { IntrospectedNamespace } from "./namespace.js";

export interface Metadata {
    deprecated?: boolean;
    deprecatedVersion?: string;
    deprecatedDoc?: string;
    introducedVersion?: string;
}

export interface BaseOptions {
    isPrivate?: boolean;
    isIntrospectable?: boolean;
}

export type Options<T> = BaseOptions & T;

export abstract class IntrospectedBase {
    name: string;
    doc?: string | null;
    metadata?: Metadata;
    deprecated?: boolean;
    resolve_names: string[] = [];
    private _emit = true;
    private _commentWarning?: string;
    private _isPrivate: boolean;
    private _isIntrospectable: boolean;

    constructor(name: string, options: BaseOptions = {}) {
        this.name = name;

        this._isPrivate = options.isPrivate ?? false;
        this._isIntrospectable = options.isIntrospectable ?? true;
    }

    /**
     * Set a warning to be emitted with this node. Often used to note type
     * conflicts or potential differences from GJS code.
     *
     * @param warning
     */
    setWarning(warning: string) {
        this._commentWarning = warning;
    }

    getWarning(): string | undefined {
        return this._commentWarning;
    }

    get isIntrospectable() {
        return this._isIntrospectable;
    }

    get isPrivate() {
        return this._isPrivate;
    }

    setPrivate(priv: boolean) {
        this._isPrivate = priv;
    }

    noEmit() {
        this._emit = false;
    }

    get emit() {
        return this._emit;
    }

    protected _copyBaseProperties(from: this): this {
        this.doc = from.doc;
        this.metadata = from.metadata;
        this.deprecated = from.deprecated;
        this.resolve_names = from.resolve_names;

        // Whether this node should be emitted.
        this._emit = from._emit;
        this._isPrivate = from._isPrivate;
        this._isIntrospectable = from.isIntrospectable;

        return this;
    }

    abstract copy(options?: { parent?: IntrospectedBase }): IntrospectedBase;

    abstract accept(visitor: GirVisitor): IntrospectedBase;

    static fromXML(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        modName: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ns: IntrospectedNamespace,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options: LoadOptions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parent: IntrospectedBase | null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        gir: object
    ): IntrospectedBase | null {
        throw new Error("GirBase cannot be instantiated");
    }

    abstract asString<T extends FormatGenerator<K>, K>(generator: T): K | null;
}

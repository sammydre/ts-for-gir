import {
  VoidType,
  UnknownType,
  NativeType,
  TypeExpression,
  ThisType,
  NumberType,
  NullableType,
  ArrayType
} from "../gir.js";
import {IntrospectedBase, Options} from './base.js';
import { IntrospectedNamespace, isIntrospectable } from "./namespace.js";
import { IntrospectedClass } from "./class.js";
import { IntrospectedClassFunction, IntrospectedFunctionParameter, IntrospectedCallback } from "./function.js";
import {  GirSignalElement, GirDirection,  GirCallableParamElement } from "@gi.ts/parser";
import { getType, parseDoc, parseMetadata } from "./util.js";
import { FormatGenerator } from "../generators/generator.js";
import { LoadOptions } from "../types.js";
import { GirVisitor } from "../visitor.js";

export enum IntrospectedSignalType {
  CONNECT,
  CONNECT_AFTER,
  EMIT
}

export class IntrospectedSignal extends IntrospectedBase {
  parameters: IntrospectedFunctionParameter[];
  return_type: TypeExpression;
  parent: IntrospectedClass;

  constructor({
    name,
    parameters = [],
    return_type = UnknownType,
    parent,
    ...args
  }: Options<{
    name: string;
    parameters?: IntrospectedFunctionParameter[];
    return_type?: TypeExpression;
    parent: IntrospectedClass;
  }>) {
    super(name, { ...args });

    this.parameters = parameters.map(p => p.copy({ parent: this }));
    this.return_type = return_type;
    this.parent = parent;
  }

  accept(visitor: GirVisitor): IntrospectedSignal {
    const node = this.copy({
      parameters: this.parameters.map(p => {
        return p.accept(visitor);
      }),
      returnType: visitor.visitType?.(this.return_type)
    });

    return visitor.visitSignal?.(node) ?? node;
  }

  copy({
    parent = this.parent,
    parameters,
    returnType
  }: {
    parent?: IntrospectedClass;
    parameters?: IntrospectedFunctionParameter[];
    returnType?: TypeExpression;
  } = {}): IntrospectedSignal {
    return new IntrospectedSignal({
      name: this.name,
      parent,
      parameters: parameters ?? this.parameters,
      return_type: returnType ?? this.return_type
    })._copyBaseProperties(this);
  }

  static fromXML(
    modName: string,
    ns: IntrospectedNamespace,
    options: LoadOptions,
    parent: IntrospectedClass,
    sig: GirSignalElement
  ): IntrospectedSignal {
    const signal = new IntrospectedSignal({
      name: sig.$.name,
      parent,
      isIntrospectable: isIntrospectable(sig)
    });

    if (sig.parameters && sig.parameters[0].parameter) {
      signal.parameters.push(
        ...sig.parameters[0].parameter
          .filter((p): p is GirCallableParamElement & { $: { name: string } } => !!p.$.name)
          .map(p => IntrospectedFunctionParameter.fromXML(modName, ns, options, signal, p))
      );
    }

    const length_params = [] as number[];

    signal.parameters = signal.parameters
      .map(p => {
        const unwrapped_type = p.type.unwrap();

        if (unwrapped_type instanceof ArrayType && unwrapped_type.length != null) {
          length_params.push(unwrapped_type.length);

          return p;
        }

        return p;
      })
      .filter((_, i) => {
        // We remove any length parameters.
        return !length_params.includes(i);
      })

      .reverse()
      .reduce(
        ({ allowOptions, params }, p) => {
          const { type, isOptional } = p;

          if (allowOptions) {
            if (type instanceof NullableType) {
              params.push(p.copy({ isOptional: true }));
            } else if (!isOptional) {
              params.push(p);
              return { allowOptions: false, params };
            } else {
              params.push(p);
            }
          } else {
            if (isOptional) {
              params.push(p.copy({ type: new NullableType(type), isOptional: false }));
            } else {
              params.push(p);
            }
          }

          return { allowOptions, params };
        },
        {
          allowOptions: true,
          params: [] as IntrospectedFunctionParameter[]
        }
      )
      .params.reverse()
      .filter((p): p is IntrospectedFunctionParameter => p != null);

    signal.return_type = getType(modName, ns, sig["return-value"]?.[0]);

    if (options.loadDocs) {
      signal.doc = parseDoc(sig);
      signal.metadata = parseMetadata(sig);
    }

    return signal;
  }

  asEmit() {
    const emit = this.copy();

    const parent = this.parent;

    const prefix_signal = emit.parameters.some(p => {
      return p.name === "signal";
    });

    const parameters = [
      new IntrospectedFunctionParameter({
        name: prefix_signal ? "$signal" : "signal",
        type: NativeType.of(`'${this.name}'`),
        direction: GirDirection.In
      }),
      ...emit.parameters
    ];

    const return_type = VoidType;

    return new IntrospectedClassFunction({
      return_type,
      parameters,
      name: "emit",
      parent
    });
  }

  asConnect(after = false) {
    const connect = this.copy();

    const name = after ? "connect_after" : "connect";

    const parent = this.parent;
    const cb = new IntrospectedCallback({
      raw_name: "callback",
      name: "callback",
      output_parameters: [],
      parameters: [
        new IntrospectedFunctionParameter({ name: "_source", type: ThisType, direction: GirDirection.In }),
        ...connect.parameters.map(p => p.copy())
      ],
      return_type: connect.return_type
    });

    const parameters = [
      new IntrospectedFunctionParameter({
        name: "signal",
        type: NativeType.of(`'${this.name}'`),
        direction: GirDirection.In
      }),
      new IntrospectedFunctionParameter({
        name: "callback",
        type: cb.asFunctionType(),
        direction: GirDirection.In
      })
    ];

    const return_type = NumberType;

    return new IntrospectedClassFunction({
      return_type,
      parameters,
      name,
      parent
    });
  }

  asString<T extends FormatGenerator<any>>(
    generator: T,
    type?: IntrospectedSignalType
  ): ReturnType<T["generateProperty"]> {
    return generator.generateSignal(this, type);
  }
}

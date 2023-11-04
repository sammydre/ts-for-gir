import { IntrospectedNamespace } from "../gir/namespace.js";
import { IntrospectedClass, GirRecord, GirInterface } from "../gir/class.js";
import { IntrospectedConstant } from "../gir/const.js";
import { IntrospectedEnum, IntrospectedError, GirEnumMember } from "../gir/enum.js";
import { GirProperty, Field } from "../gir/property.js";
import { IntrospectedSignal, IntrospectedSignalType } from "../gir/signal.js";
import { IntrospectedFunction, IntrospectedFunctionParameter, IntrospectedConstructor, IntrospectedCallback, IntrospectedDirectAllocationConstructor } from "../gir/function.js";
import { IntrospectedClassFunction } from "../gir/function.js";
import { IntrospectedStaticClassFunction } from "../gir/function.js";
import { IntrospectedVirtualClassFunction } from "../gir/function.js";
import { IntrospectedAlias } from "../gir/alias.js";
import { TypeExpression } from "../gir.js";
import { GenerationOptions } from "../types.js";

export interface GenericDescriptor {
  type: TypeExpression;
  name: string;
}

export abstract class FormatGenerator<T = string> {
  protected namespace: IntrospectedNamespace;
  protected options: GenerationOptions;

  constructor(namespace: IntrospectedNamespace, options: GenerationOptions) {
    this.namespace = namespace;
    this.options = options;
  }

  abstract generateNamespace(node: IntrospectedNamespace): Promise<T | null>;
  abstract stringifyNamespace(node: IntrospectedNamespace): Promise<string | null>;

  abstract generateCallback(node: IntrospectedCallback): T;
  abstract generateAlias(node: IntrospectedAlias): T;
  abstract generateConstructor(node: IntrospectedConstructor): T;
  abstract generateDirectAllocationConstructor(node: IntrospectedDirectAllocationConstructor): T;
  abstract generateConstructorFunction(node: IntrospectedConstructor): T;
  abstract generateRecord(node: GirRecord): T;
  abstract generateInterface(node: GirInterface): T;
  abstract generateEnumMember(node: GirEnumMember): T;
  abstract generateError(node: IntrospectedError): T;
  abstract generateEnum(node: IntrospectedEnum): T;
  abstract generateConst(node: IntrospectedConstant): T;
  abstract generateClass(node: IntrospectedClass): T;
  abstract generateParameter(node: IntrospectedFunctionParameter): T;
  abstract generateProperty(node: GirProperty, construct?: boolean): T;
  abstract generateField(node: Field): T;
  abstract generateSignal(node: IntrospectedSignal, type?: IntrospectedSignalType): T;
  abstract generateFunction(node: IntrospectedFunction): T;
  abstract generateClassFunction(node: IntrospectedClassFunction): T;
  abstract generateStaticClassFunction(node: IntrospectedStaticClassFunction): T;
  abstract generateVirtualClassFunction(node: IntrospectedVirtualClassFunction): T;
}

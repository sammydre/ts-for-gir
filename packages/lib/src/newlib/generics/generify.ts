import gio from "./gio.js";
import glib from "./glib.js";
import clutter from "./clutter.js";
import st from "./st.js";
import meta from "./meta.js";

import { IntrospectedNamespace } from "../gir/namespace.js";
import { NSRegistry } from "../gir/registry.js";
import { GenericVisitor } from "./visitor.js";

type NamespaceModifier = (namespace: IntrospectedNamespace, inferGenerics: boolean) => void;

function generifyDefinitions(registry: NSRegistry, inferGenerics: boolean, required: boolean = true) {
  return (definition: { namespace: string; version?: string; modifier: NamespaceModifier }) => {
    const version = definition?.version ?? registry.defaultVersionOf(definition.namespace);

    if (version) {
      const ns = registry.namespace(definition.namespace, version);

      if (ns) {
        definition.modifier(ns, inferGenerics);
        return;
      }
    }

    if (required) {
      console.error(`Failed to generify ${definition.namespace}`);
    }
  };
}

export function generify(registry: NSRegistry, inferGenerics: boolean) {
  const $ = generifyDefinitions(registry, inferGenerics);

  $(gio);
  $(glib);

  const $_ = generifyDefinitions(registry, inferGenerics, false);

  $_(clutter);
  $_(st);
  $_(meta);

  const visitor = new GenericVisitor(registry, inferGenerics);

  registry.registerTransformation(visitor);
}

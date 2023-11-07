import { IntrospectedNamespace, promisifyNamespaceFunctions } from "../gir/namespace.js";

import { GenerationOptions } from "../types.js";

import { override as overrideGLib } from "./dts/glib.js";
import { override as overrideGObject } from "./dts/gobject.js";
import { override as overrideGio } from "./dts/gio.js";
import { DtsGenerator } from "./dts.js";
import { IntrospectedNamespaceMember } from "../gir/base.js";

export class DtsInlineGenerator extends DtsGenerator {
    constructor(namespace: IntrospectedNamespace, options: GenerationOptions) {
        super(namespace, options);
    }

    generateNamespace(node: IntrospectedNamespace): Promise<string | null> {
        const { namespace, options } = this;

        if (options.verbose) {
            console.debug(`Resolving the types of ${namespace.name}...`);
        }

        let suffix = "";

        if (!options.noAdvancedVariants && node.name === "GLib") {
            suffix = `\n${overrideGLib(node)}\n`;
        } else if (node.name === "GObject") {
            suffix = `\n${overrideGObject(node)}\n`;
        } else if (node.name === "Gio") {
            suffix = `\n${overrideGio(node)}\n`;
        }

        try {
            const { name } = node;

            const header = `
/**
 * ${name} ${node.version}
 * 
 * Generated from ${node.package_version.join(".")}
 */
`;
            const base = `

`;

            if (options.promisify) {
                promisifyNamespaceFunctions(node);
            }

            const content = Array.from(node.members.values())
                .map(m => {
                    return `${(Array.isArray(m) ? m : [m])
                        .map(m => (m.emit ? (m as IntrospectedNamespaceMember).asString(this) : ""))
                        .join("\n")}`;
                })
                .join("\n");

            const versionedImports = true; // TODO: options.versionedImports
            // Resolve imports after we stringify everything else, sometimes we have to ad-hoc add an import.
            const imports = Array.from(node.getImports())
                .map(
                    ([i, version]) =>
                        `import * as ${i} from "${options.npmScope}${i.toLowerCase()}${
                            versionedImports ? version.toLowerCase().split(".")[0] : ""
                        }";`
                )
                .join(`${"\n"}`);

            const output = [header, imports, base, content, suffix].join("\n\n");

            if (options.verbose) {
                console.debug(`Printing ${namespace.name}...`);
            }

            return Promise.resolve(output);
        } catch (err) {
            console.error(`Failed to generate namespace: ${node.name}`);
            console.error(err);

            return Promise.resolve(null);
        }
    }

    async stringifyNamespace(node: IntrospectedNamespace): Promise<string | null> {
        return this.generateNamespace(node);
    }
}

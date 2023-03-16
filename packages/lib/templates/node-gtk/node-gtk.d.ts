/* eslint-disable @typescript-eslint/triple-slash-reference */

/*
 * Type Definitions for node-gtk (https://github.com/romgrk/node-gtk)
 *
 * These type definitions are automatically generated, do not edit them by hand.
 * If you found a bug fix it in <%= APP_NAME %> itself or create a bug report on <%= APP_SOURCE %>
 */

<%_ for (const girModule of girModules) { _%>
    <%_ const pkg = dep.get(girModule.namespace, girModule.version) _%>
    <%_ if(noNamespace){ _%>
import type * as <%= girModule.importNamespace %> from "<%= pkg.importPath %>";
    <%_ } else { _%>
import type <%= girModule.importNamespace %> from "<%= pkg.importPath %>";
    <%_ } _%>
<%_ } _%>


export function require(ns: string, ver?: string): any;
<%_ for (const girModule of girModules) { _%>
export function require(ns: '<%= girModule.namespace %>', ver: '<%= girModule.version %>'): typeof <%= girModule.importNamespace %>;
<%_ } _%>
export function startLoop(): void;
export function registerClass(object: any): void

declare const gi: {
    require: typeof require,
    startLoop: typeof startLoop,
    registerClass: typeof registerClass,
}
export default gi

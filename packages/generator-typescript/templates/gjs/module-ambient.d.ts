<%#
    // This EJS template is used for the generated .d.ts files for ambient typescript module support.
    // See https://www.typescriptlang.org/docs/handbook/modules.html#ambient-modules
_%>
<%_ const pkg = dep.get(girModule.namespace, girModule.version) _%>
<%_ let moduleImportStr = ""; _%>
<%_ if(noNamespace){ _%>
    <%_ moduleImportStr = `import * as ${girModule.importNamespace} from '${pkg.importPath}'`; _%>
<%_ } else { _%>
    <%_ moduleImportStr = `import ${girModule.importNamespace} from '${pkg.importPath}'`; _%>
<%_ } _%>

declare module 'gi://<%= name %>?version=<%= version %>' {
    <%- moduleImportStr %>;
    export default <%- girModule.importNamespace -%>;
}

<%# // Generate ambient module declarations Without version number if this is the latest version _%>
<%_ if (dep.isLatestVersion(pkg.namespace, pkg.version)) { _%>
declare module 'gi://<%= name %>' {
    import <%- girModule.importNamespace -%> from 'gi://<%= name %>?version=<%= version %>';
    export default <%- girModule.importNamespace -%>;
}
<%_ } _%>
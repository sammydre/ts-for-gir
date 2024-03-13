<%# This EJS template is used for the generated .d.ts file of each GIR module like Gtk-4.0, GObject-2.0, ... %>
/*
 * Type Definitions for Gjs (https://gjs.guide/)
 *
 * These type definitions are automatically generated, do not edit them by hand.
 * If you found a bug fix it in `<%= APP_NAME %>` or create a bug report on <%= APP_SOURCE %>
 */

import './<%= importName %>-ambient.d.ts';
<%# Only define the import type definition if the module has no version conflict %>
<%_ if(!dep.isLatestVersion(girModule.namespace, girModule.version)){ _%>
import './<%= importName %>-import.d.ts';
<%_ } _%>

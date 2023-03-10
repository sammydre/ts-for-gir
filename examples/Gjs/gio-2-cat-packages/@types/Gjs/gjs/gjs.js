
  export const byteArray = imports.byteArray;
  export const lang = imports.lang;
  export const format = imports.format;
  export const mainloop = imports.mainloop;
  export const gettext = imports.gettext;
  export const system = imports.system;
  export const signals = imports.signals;
  // "package" is a reserved word and cannot be used in strict mode / an ECMAScript module
  export const Package = imports.package;
  const Gjs = {
    byteArray,
    lang,
    format,
    mainloop,
    gettext,
    system,
    signals,
    package: Package
  }
  export default Gjs


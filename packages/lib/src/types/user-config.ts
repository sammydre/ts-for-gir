/**
 * Types for config file
 */
export interface UserConfig {
    /** root / working directory of your project */
    root: string
    /** directory to output to */
    outdir: string | null
    /** GIR directories */
    girDirectories: string[]
    /** Switch on/off the verbose mode */
    verbose: boolean
    /** Do not ask for package versions if multiple versions are found */
    ignoreVersionConflicts: boolean
    /** print the output to console and create no files */
    print: boolean
    /** GIR modules to load, e.g. 'Gio-2.0'. Accepts multiple modules */
    modules: string[]
    /** modules that should be ignored */
    ignore?: string[]
    /** Do not export all symbols for each module as a namespace */
    noNamespace: boolean
    /** Do not generate documentation comments */
    noComments: boolean
    /** Do not generate debugging inline comments */
    noDebugComments: boolean
    /** Fix Inheritance and implementation type conflicts */
    fixConflicts: boolean
    /** Generate promisified functions for async/finish calls */
    promisify: boolean
    /** Scope of the generated NPM packages */
    npmScope: string
    /** Adds Yarn workspace support to the NPM packages */
    packageYarn: boolean
}

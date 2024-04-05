import { findFileInDirs, splitModuleName, pascalCase } from './utils.js'
import { Logger } from './logger.js'
import { Transformation } from './transformation.js'

import type { GirInclude } from '@gi.ts/parser'
import type { Dependency, GenerateConfig } from './types/index.js'
import type { GirModule } from './gir-module.js'
import { GirNSRegistry } from './registry.js'

export class DependencyManager extends GirNSRegistry {
    protected log: Logger
    protected transformation: Transformation

    cache: { [packageName: string]: Dependency } = {}

    static instance?: DependencyManager

    protected constructor(protected readonly config: GenerateConfig) {
        super()

        this.transformation = new Transformation(config)
        this.log = new Logger(config.verbose, 'DependencyManager')
    }

    /**
     * Get the DependencyManager singleton instance
     */
    static getInstance(config: GenerateConfig): DependencyManager {
        if (this.instance) {
            return this.instance
        }
        this.instance = new DependencyManager(config)
        return this.instance
    }

    protected parseArgs(namespaceOrPackageName: string, version?: string) {
        let packageName: string
        let namespace: string
        if (version) {
            namespace = namespaceOrPackageName
            packageName = `${namespace}-${version}`
        } else {
            packageName = namespaceOrPackageName
            const { namespace: _namespace, version: _version } = splitModuleName(packageName)
            namespace = _namespace
            version = _version
        }
        return { packageName, namespace, version }
    }

    /**
     * Get all dependencies in the cache
     * @returns All dependencies in the cache
     */
    all(): Dependency[] {
        return Object.values(this.cache)
    }

    getAllPackageNames(): string[] {
        return Object.keys(this.cache)
    }

    /**
     * Get the core dependencies
     * @returns
     */
    core(): Dependency[] {
        return [this.get('GObject-2.0'), this.get('GLib-2.0')]
    }

    createImportProperties(namespace: string, packageName: string) {
        const importPath = this.createImportPath(packageName)
        const importDef = this.createImportDef(namespace, importPath)
        return {
            importPath,
            importDef,
        }
    }

    createImportPath(packageName: string): string {
        const importName = this.transformation.transformImportName(packageName)
        const importPath = `${this.config.npmScope}/${importName}`
        return importPath
    }

    createImportDef(namespace: string, importPath: string): string {
        return this.config.noNamespace
            ? `import type * as ${namespace} from '${importPath}'`
            : `import type ${namespace} from '${importPath}';`
    }

    /**
     * Get the dependency object by packageName
     * @param packageName The package name (with version affix) of the dependency
     * @returns The dependency object
     */
    get(packageName: string): Dependency
    /**
     * Get the dependency object by namespace and version
     * @param namespace The namespace of the dependency
     * @param version The version of the dependency
     * @returns The dependency object
     */
    get(namespace: string, version: string): Dependency
    get(namespaceOrPackageName: string, version?: string): Dependency {
        // Special case for Gjs
        if (namespaceOrPackageName === 'Gjs') {
            return this.getGjs()
        }

        const args = this.parseArgs(namespaceOrPackageName, version)
        version = args.version
        const packageName = args.packageName
        const namespace = args.namespace

        if (this.cache[packageName]) {
            const dep = this.cache[packageName]
            return dep
        }
        const filename = `${packageName}.gir`
        const { exists, path } = findFileInDirs(this.config.girDirectories, filename)

        const dependency: Dependency = {
            namespace,
            exists,
            filename,
            path,
            packageName,
            importName: this.transformation.transformImportName(packageName),
            version,
            ...this.createImportProperties(namespace, packageName),
        }

        this.cache[packageName] = dependency

        return dependency
    }

    /**
     * Get all dependencies with the given namespace
     * @param namespace The namespace of the dependency
     * @returns All dependencies with the given namespace
     */
    list(namespace: string): Dependency[] {
        const packageNames = this.all()
        const candidates = packageNames.filter((dep) => {
            return dep.namespace === namespace
        })
        return candidates
    }

    /**
     * Get girModule for dependency
     * @param girModules
     * @param packageName
     */
    getModule(girModules: GirModule[], dep: Dependency): GirModule | undefined {
        return girModules.find(
            (m) => m.packageName === dep.packageName && m.namespace === dep.namespace && m.version === dep.version,
        )
    }

    /**
     * Add all dependencies from an array of gir modules
     * @param girModules
     */
    addAll(girModules: GirModule[]): Dependency[] {
        for (const girModule of girModules) {
            this.get(girModule.namespace, girModule.version || '0.0')
        }
        return this.all()
    }

    /**
     * Transforms a gir include object array to a dependency object array
     * @param girIncludes - Array of gir includes
     * @returns Array of dependencies
     */
    fromGirIncludes(girIncludes: GirInclude[]): Dependency[] {
        const dependencies: Dependency[] = []
        for (const i of girIncludes) {
            dependencies.unshift(this.get(i.$.name, i.$.version || '0.0'))
        }
        return dependencies
    }

    /**
     * Check if multiple dependencies with the given namespace exist in the cache
     * @param namespace The namespace of the dependency
     * @returns
     */
    hasConflict(namespace: string): boolean {
        const packageNames = this.getAllPackageNames()
        const candidates = packageNames.filter((packageName) => {
            return packageName.startsWith(`${namespace}-`) && this.cache[packageName].namespace === namespace
        })

        return candidates.length > 1
    }

    /**
     * get the latest version of the dependency with the given namespace
     * @param namespace The namespace of the dependency
     * @returns The latest version of the dependency
     */
    getLatestVersion(namespace: string): Dependency | undefined {
        const candidates = this.list(namespace)
        const latestVersion = candidates
            .sort((a, b) => {
                return a.version.localeCompare(b.version)
            })
            .pop()
        return latestVersion
    }

    /**
     * Check if the given version is the latest version of the dependency
     * @param namespace The namespace of the dependency
     * @param version The version of the dependency
     * @returns
     */
    isLatestVersion(namespace: string, version: string): boolean {
        const latestVersion = this.getLatestVersion(namespace)
        return latestVersion?.version === version
    }

    /**
     * Find a dependency by it's namespace from the cache, if multiple versions are found, the latest version is returned
     * @param namespace The namespace of the dependency
     * @returns The dependency object or null if not found
     */
    find(namespace: string): Dependency | null {
        // Special case for Gjs
        if (namespace === 'Gjs') {
            return this.getGjs()
        }

        const packageNames = this.getAllPackageNames()
        const candidates = packageNames.filter((packageName) => {
            return packageName.startsWith(`${namespace}-`) && this.cache[packageName].namespace === namespace
        })

        if (candidates.length > 1) {
            this.log.warn(`Found multiple versions of ${namespace}: ${candidates.join(', ')}`)
        }

        const latestVersion = candidates.sort().pop()

        if (latestVersion && this.cache[latestVersion]) {
            const dep = this.cache[latestVersion]
            return dep
        }

        return null
    }

    protected getPseudoPackage(packageName: string): Dependency {
        if (this.cache[packageName]) {
            return this.cache[packageName]
        }

        const dep: Dependency = {
            namespace: pascalCase(packageName),
            exists: true,
            filename: '',
            path: '',
            packageName: packageName,
            importName: this.transformation.transformImportName(packageName),
            version: '0.0',
            ...this.createImportProperties(packageName, packageName),
        }

        return dep
    }

    getGjs(): Dependency {
        return this.getPseudoPackage('Gjs')
    }
}

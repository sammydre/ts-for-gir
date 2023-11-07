import { mkdir } from 'fs/promises'
import {
    GirModule,
    Logger,
    START_MODULE,
    FILE_PARSING_DONE,
    TSDATA_PARSING_DONE,
    GENERATING_TYPES_DONE,
    ERROR_NO_MODULE_SPECIFIED,
} from '@ts-for-gir/lib'
import { GeneratorType, Generator } from '@ts-for-gir/generator-base'
import { TypeDefinitionGenerator } from '@ts-for-gir/generator-typescript'
// import { HtmlDocGenerator } from '@ts-for-gir/generator-html-doc'

import type { InheritanceTable, GenerateConfig, NSRegistry } from '@ts-for-gir/lib'

export class GenerationHandler {
    log: Logger
    generator: Generator

    constructor(
        private readonly config: GenerateConfig,
        type: GeneratorType,
    ) {
        this.log = new Logger(config.environment, config.verbose, 'GenerationHandler')

        switch (type) {
            case GeneratorType.TYPES:
                this.generator = new TypeDefinitionGenerator(config)
                break
            // case GeneratorType.HTML_DOC:
            //     this.generator = new HtmlDocGenerator(config)
            //     break
            default:
                throw new Error('Unknown Generator')
        }
    }

    private finalizeInheritance(inheritanceTable: InheritanceTable): void {
        for (const clsName of Object.keys(inheritanceTable)) {
            let p: string | string[] = inheritanceTable[clsName][0]
            while (p) {
                p = inheritanceTable[p]
                if (p) {
                    p = p[0]
                    inheritanceTable[clsName].push(p)
                }
            }
        }
    }

    public async start(girModules: GirModule[], registry: NSRegistry): Promise<void> {
        this.log.info(START_MODULE(this.config.environment, this.config.buildType))

        if (girModules.length == 0) {
            this.log.error(ERROR_NO_MODULE_SPECIFIED)
        }

        GirModule.allGirModules = girModules

        this.log.info(FILE_PARSING_DONE)

        const inheritanceTable: InheritanceTable = {}
        for (const girModule of girModules) girModule.init(inheritanceTable)

        this.finalizeInheritance(inheritanceTable)

        this.log.info(TSDATA_PARSING_DONE)

        for (const girModule of girModules) {
            if (this.config.outdir) {
                await mkdir(this.config.outdir, { recursive: true })
            }
            this.log.log(` - ${girModule.packageName} ...`)
            girModule.start(girModules)
        }

        // TODO: Put this somewhere that makes sense
        registry.transform({
            environment: 'gjs',
            inferGenerics: true,
            verbose: this.config.verbose,
        })

        await this.generator.start(registry)

        for (const girModule of girModules) {
            await this.generator.generate(registry, girModule)
        }

        await this.generator.finish(registry)

        this.log.success(GENERATING_TYPES_DONE)
    }
}

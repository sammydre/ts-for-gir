import type { InjectionClass } from '../types/index.js'

export const classesNode: InjectionClass[] = [
    // TODO set version GLib-2.0
    {
        qualifiedName: 'GLib.MainLoop',
        methods: [
            {
                girTypeName: 'method',
                name: 'run',
                returnTypes: [{ type: 'void' }],
            },
            {
                girTypeName: 'method',
                name: 'quit',
                returnTypes: [{ type: 'void' }],
            },
        ],
    },
    // TODO set version Gdk-4.0
    // See https://github.com/romgrk/node-gtk/blob/master/lib/overrides/Gdk-4.0.js
    {
        qualifiedName: 'Gdk.RGBA',
        constructors: [
            {
                girTypeName: 'constructor',
                isStatic: true,
                name: 'create',
                returnTypes: [{ type: 'Gdk.RGBA' }],
                inParams: [
                    {
                        name: 'value',
                        type: [{ type: 'string' }],
                    },
                ],
                doc: {
                    text: 'Creates a new color from the given string. Passes value to `GdkRGBA.parse()`',
                    tags: [
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'value',
                        },
                    ],
                },
            },
        ],
    },
    // TODO set version Graphene-1.0
    // See https://github.com/romgrk/node-gtk/blob/master/lib/overrides/Graphene-1.0.js
    {
        qualifiedName: 'Graphene.Rect',
        constructors: [
            {
                girTypeName: 'constructor',
                isStatic: true,
                name: 'create',
                returnTypes: [{ type: 'Graphene.Rect' }],
                inParams: [
                    {
                        name: 'x',
                        type: [{ type: 'number' }],
                    },
                    {
                        name: 'y',
                        type: [{ type: 'number' }],
                    },
                    {
                        name: 'width',
                        type: [{ type: 'number' }],
                    },
                    {
                        name: 'height',
                        type: [{ type: 'number' }],
                    },
                ],
                doc: {
                    text: 'Creates a new Rect with the given values',
                    tags: [
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'x',
                        },
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'y',
                        },
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'width',
                        },
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'height',
                        },
                    ],
                },
            },
        ],
    },
    {
        qualifiedName: 'Graphene.Point',
        constructors: [
            {
                girTypeName: 'constructor',
                isStatic: true,
                name: 'create',
                returnTypes: [{ type: 'Graphene.Point' }],
                inParams: [
                    {
                        name: 'x',
                        type: [{ type: 'number' }],
                    },
                    {
                        name: 'y',
                        type: [{ type: 'number' }],
                    },
                ],
                doc: {
                    text: 'Creates a new Point with the given values',
                    tags: [
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'x',
                        },
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'y',
                        },
                    ],
                },
            },
        ],
    },
    {
        qualifiedName: 'Graphene.Size',
        constructors: [
            {
                girTypeName: 'constructor',
                isStatic: true,
                name: 'create',
                returnTypes: [{ type: 'Graphene.Size' }],
                inParams: [
                    {
                        name: 'width',
                        type: [{ type: 'number' }],
                    },
                    {
                        name: 'height',
                        type: [{ type: 'number' }],
                    },
                ],
                doc: {
                    text: 'Creates a new Size with the given values',
                    tags: [
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'width',
                        },
                        {
                            paramName: '',
                            tagName: 'param',
                            text: 'height',
                        },
                    ],
                },
            },
        ],
    },
]

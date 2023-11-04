import { IntrospectedNamespace } from "../gir/namespace.js";
import {
    IntrospectedClassFunction,
    IntrospectedConstructor,
    IntrospectedFunction,
    IntrospectedFunctionParameter,
    IntrospectedStaticClassFunction
} from "../gir/function.js";
import {
    StringType,
    NativeType,
    FunctionType,
    GenerifiedType,
    GenericType,
    AnyFunctionType,
    ArrayType,
    AnyType,
    VoidType,
    GenerifiedTypeIdentifier,
    Generic
} from "../gir.js";
import { GirDirection } from "@gi.ts/parser";
import { Field, JSField } from "../gir/property.js";
import { IntrospectedClass, IntrospectedInterface } from "../gir/class.js";

export default {
    namespace: "Gio",
    version: "2.0",
    modifier(namespace: IntrospectedNamespace) {
        // For IterableIterator...
        namespace.___dts___addReference('/// <reference lib="es2015.iterable" />');

        {
            const DBusNodeInfo = namespace.assertClass("DBusNodeInfo");

            DBusNodeInfo.constructors.push(
                new IntrospectedConstructor({
                    name: "new_for_xml",
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "info",
                            type: StringType,
                            direction: GirDirection.In
                        })
                    ],
                    return_type: DBusNodeInfo.getType()
                })
            );
        }

        {
            const DBusInterfaceInfo = namespace.assertClass("DBusInterfaceInfo");

            DBusInterfaceInfo.constructors.push(
                new IntrospectedConstructor({
                    name: "new_for_xml",
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "info",
                            type: StringType,
                            direction: GirDirection.In
                        })
                    ],
                    return_type: DBusInterfaceInfo.getType()
                })
            );
        }

        {
            const ListStore = namespace.assertClass("ListStore");

            ListStore.fields.push(
                new Field({
                    name: "Symbol.iterator",
                    computed: true,
                    type: new FunctionType(
                        {},
                        new GenerifiedType(new NativeType("IterableIterator"), new GenericType("A"))
                    )
                })
            );
        }

        {
            const SettingsSchema = namespace.assertClass("SettingsSchema");

            SettingsSchema.fields.push(
                new JSField({
                    name: "_realGetKey",
                    type: new NativeType("typeof SettingsSchema.prototype.get_key")
                })
            );
        }

        {
            const Settings = namespace.assertClass("Settings");

            Settings.fields.push(
                new JSField({
                    name: "_realInit",
                    type: AnyFunctionType
                }),
                new JSField({
                    name: "_realMethods",
                    type: new NativeType("typeof Settings.prototype")
                }),
                new JSField({
                    name: "_keys",
                    type: new ArrayType(StringType)
                }),
                new JSField({
                    name: "_children",
                    type: new ArrayType(StringType)
                })
            );
        }
        {
            const DBusProxy = namespace.assertClass("DBusProxy");

            // This is not ideal, but DBusProxy's define functions and properties on the prototype.
            DBusProxy.indexSignature = "[key: string]: any;";

            DBusProxy.members.push(
                new IntrospectedStaticClassFunction({
                    name: "makeProxyWrapper",
                    parent: DBusProxy,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "args",
                            type: new ArrayType(AnyType),
                            isVarArgs: true,
                            direction: GirDirection.In
                        })
                    ],
                    return_type: AnyType
                }),
                new IntrospectedClassFunction({
                    name: "connectSignal",
                    parent: DBusProxy,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "args",
                            type: new ArrayType(AnyType),
                            isVarArgs: true,
                            direction: GirDirection.In
                        })
                    ],
                    return_type: AnyType
                }),
                new IntrospectedClassFunction({
                    name: "disconnectSignal",
                    parent: DBusProxy,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "args",
                            type: new ArrayType(AnyType),
                            isVarArgs: true,
                            direction: GirDirection.In
                        })
                    ],
                    return_type: AnyType
                })
            );
        }

        {
            const [bus_get] = namespace.getMembers("bus_get");
            const [bus_get_finish] = namespace.getMembers("bus_get_finish");
            const [bus_get_sync] = namespace.getMembers("bus_get_sync");
            const [bus_own_name] = namespace.getMembers("bus_own_name");
            const [bus_own_name_on_connection] = namespace.getMembers("bus_own_name_on_connection");
            const [bus_unown_name] = namespace.getMembers("bus_unown_name");
            const [bus_watch_name] = namespace.getMembers("bus_watch_name");
            const [bus_unwatch_name] = namespace.getMembers("bus_unwatch_name");
            const [bus_watch_name_on_connection] = namespace.getMembers("bus_watch_name_on_connection");

            if (
                !(
                    bus_get instanceof IntrospectedFunction &&
                    bus_get_finish instanceof IntrospectedFunction &&
                    bus_get_sync instanceof IntrospectedFunction &&
                    bus_own_name instanceof IntrospectedFunction &&
                    bus_own_name_on_connection instanceof IntrospectedFunction &&
                    bus_unown_name instanceof IntrospectedFunction &&
                    bus_watch_name instanceof IntrospectedFunction &&
                    bus_unwatch_name instanceof IntrospectedFunction &&
                    bus_watch_name_on_connection instanceof IntrospectedFunction
                )
            ) {
                throw new Error("Invalid dbus functions found in Gio!");
            }

            const DBus = new IntrospectedInterface({
                name: "DBus",
                namespace
            });

            DBus.members.push(
                ...[
                    bus_get,
                    bus_get_finish,
                    bus_get_sync,
                    bus_own_name,
                    bus_own_name_on_connection,
                    bus_unown_name,
                    bus_watch_name,
                    bus_unwatch_name,
                    bus_watch_name_on_connection
                ]
                    .map(fn => fn.asStaticClassFunction(DBus))
                    .map(fn => {
                        const member = fn.copy();

                        member.name = member.name.substring(4);

                        return member;
                    })
            );

            const DBusConnection = namespace.assertClass("DBusConnection");

            const call = DBusConnection.members.find(m => m.name === "call");
            const callFinish = DBusConnection.members.find(m => m.name === "call_finish");

            if (!call || !callFinish) {
                throw new Error("Missing call or call_finish in Gio.DBusConnection.");
            }

            // Add <T> generic
            const call_generic = new Generic(new GenericType("T"), AnyType, undefined, StringType);
            call.generics.push(call_generic);
            callFinish.generics.push(call_generic);

            const replacement = call.copy({
                parameters: call.parameters.map(p => {
                    if (p.name === "reply_type") {
                        // Generify the parameter
                        return p.copy({
                            type: p.type.rewrap(
                                new GenerifiedTypeIdentifier("VariantType", "GLib", [new GenericType("T")])
                            )
                        });
                    }

                    return p;
                })
            });

            const finishReplacement = callFinish.copy({
                returnType: callFinish
                    .return()
                    .rewrap(new GenerifiedTypeIdentifier("Variant", "GLib", [new GenericType("T")]))
            });

            DBusConnection.members.splice(DBusConnection.members.indexOf(call), 1, replacement);
            DBusConnection.members.splice(DBusConnection.members.indexOf(callFinish), 1, finishReplacement);

            DBusConnection.members.push(
                new IntrospectedClassFunction({
                    name: "watch_name",
                    parameters: bus_watch_name_on_connection.parameters.slice(1),
                    return_type: bus_watch_name_on_connection.return_type,
                    parent: DBusConnection
                }),
                new IntrospectedClassFunction({
                    name: "unwatch_name",
                    parameters: bus_unwatch_name.parameters.slice(),
                    return_type: bus_unwatch_name.return_type,
                    parent: DBusConnection
                }),
                new IntrospectedClassFunction({
                    name: "own_name",
                    parameters: bus_own_name_on_connection.parameters.slice(1),
                    return_type: bus_own_name_on_connection.return_type,
                    parent: DBusConnection
                }),
                new IntrospectedClassFunction({
                    name: "unown_name",
                    parameters: bus_unown_name.parameters.slice(),
                    return_type: bus_unown_name.return_type,
                    parent: DBusConnection
                })
            );

            DBus.fields.push(
                new JSField({
                    isStatic: true,
                    name: "session",
                    type: DBusConnection.getType(),
                    writable: false
                }),
                new JSField({
                    isStatic: true,
                    name: "system",
                    type: DBusConnection.getType(),
                    writable: false
                })
            );

            namespace.members.set("DBus", DBus);
        }

        // From GJS Documentation:
        //
        // `Gio.DBusExportedObject.wrapJSObject(Gio.DbusInterfaceInfo, jsObj)`

        // Takes `jsObj`, an object instance implementing the interface described by `Gio.DbusInterfaceInfo`, and returns an implementation object with these methods:

        // * `export(busConnection, objectPath)`
        // * `unexport()`
        // * `flush()`
        // * `emit_signal(name, variant)`
        // * `emit_property_changed(name, variant)`

        {
            const Variant = namespace.assertInstalledImport("GLib").assertClass("Variant");
            const DBusConnection = namespace.assertClass("DBusConnection");
            const DBusInterfaceInfo = namespace.assertClass("DBusInterfaceInfo");
            const DBusExportedObject = new IntrospectedClass("DBusExportedObject", namespace);

            DBusExportedObject.members.push(
                new IntrospectedStaticClassFunction({
                    name: "wrapJSObject",
                    parent: DBusExportedObject,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "info",
                            type: StringType,
                            direction: GirDirection.In
                        }),
                        new IntrospectedFunctionParameter({
                            name: "obj",
                            type: AnyType,
                            direction: GirDirection.In
                        })
                    ],
                    return_type: DBusExportedObject.getType()
                }),
                new IntrospectedClassFunction({
                    name: "get_info",
                    parent: DBusExportedObject,
                    parameters: [],
                    return_type: DBusInterfaceInfo.getType()
                }),
                new IntrospectedClassFunction({
                    name: "get_connection",
                    parent: DBusExportedObject,
                    parameters: [],
                    return_type: DBusConnection.getType()
                }),
                new IntrospectedClassFunction({
                    name: "get_object_path",
                    parent: DBusExportedObject,
                    parameters: [],
                    return_type: StringType
                }),
                new IntrospectedClassFunction({
                    name: "unexport_from_connection",
                    parent: DBusExportedObject,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "connection",
                            type: DBusConnection.getType(),
                            direction: GirDirection.In
                        })
                    ],
                    return_type: VoidType
                }),
                // export(busConnection, objectPath)
                new IntrospectedClassFunction({
                    name: "export",
                    parent: DBusExportedObject,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "busConnection",
                            type: DBusConnection.getType(),
                            direction: GirDirection.In
                        }),
                        new IntrospectedFunctionParameter({
                            name: "objectPath",
                            type: StringType,
                            direction: GirDirection.In
                        })
                    ],
                    return_type: VoidType
                }),
                // unexport()
                new IntrospectedClassFunction({
                    name: "unexport",
                    parent: DBusExportedObject,
                    return_type: VoidType
                }),
                // flush()
                new IntrospectedClassFunction({
                    name: "flush",
                    parent: DBusExportedObject,
                    return_type: VoidType
                }),
                // emit_signal(name, variant)
                new IntrospectedClassFunction({
                    name: "emit_signal",
                    parent: DBusExportedObject,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "name",
                            type: StringType,
                            direction: GirDirection.In
                        }),
                        new IntrospectedFunctionParameter({
                            name: "variant",
                            type: Variant.getType(),
                            direction: GirDirection.In
                        })
                    ],
                    return_type: VoidType
                }),
                // emit_property_changed(name, variant)
                new IntrospectedClassFunction({
                    name: "emit_property_changed",
                    parent: DBusExportedObject,
                    parameters: [
                        new IntrospectedFunctionParameter({
                            name: "name",
                            type: StringType,
                            direction: GirDirection.In
                        }),
                        new IntrospectedFunctionParameter({
                            name: "variant",
                            type: Variant.getType(),
                            direction: GirDirection.In
                        })
                    ],
                    return_type: VoidType
                })
            );

            namespace.members.set("DBusExportedObject", DBusExportedObject);
        }
    }
};

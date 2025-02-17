import { GenericType } from "../gir.js";
import { IntrospectedNamespace } from "../gir/namespace.js";

export const clutterTemplate = (version: string) => ({
    namespace: "Clutter",
    version,
    modifier: (namespace: IntrospectedNamespace, inferGenerics: boolean) => {
        if (!inferGenerics) {
            return;
        }

        const Actor = namespace.assertClass("Actor");
        const Content = namespace.assertClass("Content");
        const LayoutManager = namespace.assertClass("LayoutManager");

        Actor.addGeneric({
            default: LayoutManager.getType(),
            constraint: LayoutManager.getType()
        });

        Actor.addGeneric({
            default: Content.getType(),
            constraint: Content.getType()
        });

        Actor.props
            .filter(p => p.name === "layout_manager" || p.name === "layoutManager")
            .forEach(prop => {
                // TODO Automatically infer such changes.
                prop.type = new GenericType("A", Content.getType());
            });

        Actor.props
            .filter(p => p.name === "content")
            .forEach(prop => {
                // TODO Automatically infer such changes.
                prop.type = new GenericType("B", Content.getType());
            });

        const Clone = namespace.assertClass("Clone");

        Clone.addGeneric({
            default: Actor.getType(),
            constraint: Actor.getType()
        });

        Clone.props
            .filter(p => p.name === "source")
            .forEach(prop => {
                // TODO Automatically infer such changes.
                prop.type = new GenericType("A", Content.getType());
            });
    }
});

export const clutter10 = clutterTemplate("10");
export const clutter11 = clutterTemplate("11");
export const clutter12 = clutterTemplate("12");
export const clutter13 = clutterTemplate("13");
export const clutter14 = clutterTemplate("14");
export const clutter15 = clutterTemplate("15");
export const clutter16 = clutterTemplate("16");
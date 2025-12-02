import chalk from "chalk";
import { type XastElement, type PluginConfig } from "svgo";
import { fillMap } from "../config.js";

export type OutputType = "Spot" | "Icon";

function log(message: string, prefix?: string) {
    message = message.replace(/(\d+)/g, (d) => chalk.bold(d));
    console.log(prefix, message);
}

export function info(message: string) {
    log(message, chalk.blue("i"));
}

export function success(message: string) {
    log(message, chalk.green("✓"));
}

export function warn(...args: unknown[]) {
    console.warn(chalk.yellow.bold("WARNING"), ...args);
}

export function error(...args: unknown[]) {
    console.error(chalk.red.bold("ERROR"), chalk.red(...args));
}

export interface Definitions {
    [iconName: string]: string | Record<string, string>;
}

// Helper for dealing with Figma component variants
// Expects something like "Size=20, Style=Fill" or "Prop=True"
export function flattenFigmaComponentVariantName(name: string): string {
    return name
        .split(",") // split by commas ['Prop=Val', ...]
        .map((pair) => {
            const [prop, valRaw] = pair.split("=").map((s) => s.trim());
            const val = String(valRaw ?? "").replace(/\s+/g, "");

            // Skip "Default" values or False props
            if (val === "Default" || val === "" || val === "False") return "";

            // If it is a faux boolean, use that prop in the name
            if (val === "True") {
                return prop;
            }

            // Otherwise use the value, as before
            return val;
        })
        .join("");
}

export function flattenDefinitions(defs: Definitions): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [iconName, iconValue] of Object.entries(defs)) {
        if (typeof iconValue === "string") {
            out[iconName] = iconValue;
        } else if (iconValue != null) {
            for (const [variant, hash] of Object.entries(iconValue)) {
                const flattened = flattenFigmaComponentVariantName(variant);
                out[iconName + flattened] = hash;
            }
        }
    }

    return out;
}

// Define SVGO plugins to run, the order is important
export function svgoPlugins(
    type: string,
    name: string,
    isAnimated: boolean
): PluginConfig[] {
    return [
        // With the figma setting svg_include_id sometimes there is a parent group with an id of the component name
        {
            name: "removeAttributesBySelector",
            params: {
                selectors: [
                    {
                        attributes: ["id"],
                        selector: "svg > g",
                    },
                ],
            },
        },
        {
            name: "removeAttributesBySelector",
            params: {
                selectors: [
                    {
                        attributes: ["clip-rule", "fill-rule"],
                        selector: "path",
                    },
                ],
            },
        },
        // This runs in preset but run here to normalise colors to make it easier to replace them in the next step
        "convertColors",
        {
            fn: () => ({
                element: {
                    enter: (node: XastElement) => {
                        const attrs = node.attributes;
                        if (!attrs) return;

                        // If we have a group named currentColor, swap it to a fill
                        // In the preset moveElemsAttrsToGroup will handle collapsing the group later by moving the fill to the children
                        if (attrs["id"] === "currentColor") {
                            delete attrs["id"];
                            attrs["fill"] = "currentColor";
                        }

                        // Swap any colors for our fill map
                        if (attrs["fill"]) {
                            const rawFill = attrs["fill"].toLowerCase();

                            if (rawFill in fillMap) {
                                const mapped = fillMap[rawFill];

                                if (mapped === null) {
                                    // if we set as null = remove the fill entirely
                                    delete attrs["fill"];
                                } else {
                                    // replace with Stacks var or new value
                                    attrs["fill"] = mapped as string;
                                }
                            }
                        }
                    },
                },
            }),
            name: "fillMap",
        },
        // For animations we want to covert layer ID names defined in Figma to classes so they can be reused
        isAnimated
            ? {
                  fn: () => ({
                      element: {
                          enter: (node: XastElement) => {
                              const idValue = node.attributes["id"];
                              if (!idValue) return;
                              delete node.attributes["id"];

                              node.attributes["class"] = node.attributes[
                                  "class"
                              ]
                                  ? `${node.attributes["class"]} ${idValue}`
                                  : `${idValue}`;
                          },
                      },
                  }),
                  name: "convertIdToClass",
              }
            : undefined,
        {
            name: "preset-default",
            params: {
                overrides: {
                    convertShapeToPath: false,
                    ...(isAnimated
                        ? {
                              inlineStyles: false,
                          }
                        : {}),
                },
            },
        },
        {
            name: "removeUselessStrokeAndFill",
            params: {
                removeNone: true,
            },
        },
        {
            name: "prefixIds",
            params: {
                delim: "__",
                prefix: `${type.toLowerCase()}-${name.toLowerCase()}`,
                prefixClassNames: true,
                prefixIds: true,
            },
        },
        {
            name: "addClassesToSVGElement",
            params: {
                className: `svg-${type?.toLowerCase()} ${type}${name}`,
            },
        },
        {
            name: "addAttributesToSVGElement",
            params: {
                attributes: [{ "aria-hidden": "true" }],
            },
        },

        "removeXMLNS",
        "removeXlink",
    ].filter(Boolean) as PluginConfig[];
}

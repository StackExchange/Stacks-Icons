import chalk from "chalk";

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
        } else {
            for (const [variant, hash] of Object.entries(iconValue)) {
                const flattened = flattenFigmaComponentVariantName(variant);
                out[iconName + flattened] = hash;
            }
        }
    }

    return out;
}

// export function stacksSvgoTransforms(params: { name: string, type: string }): any {
//     return {
//     name: "stacks-svg-transforms",
//     type: "full",
//     fn: (ast: any) => {
//       const fillMap: Record<string, string | null> = {
//         "#000": null,
//         "none": null,
//         "#222426": "var(--black-600)",
//         "#fff": "var(--white)",
//         "#ffffff": "var(--white)",
//         "#6a7e7c": "var(--black-400)",
//         "#1a1104": "var(--black-600)",
//       };

//       const walk = (node: any) => {
//         // Handle fills
//         if (node.attributes?.fill) {
//           const fill = node.attributes.fill.toLowerCase();

//           if (fillMap.hasOwnProperty(fill)) {
//             const replacement = fillMap[fill];

//             if (replacement === null) delete node.attributes.fill;

//             else node.attributes.fill = replacement;
//           }
//         }

//         // Convert IDs to classes (incase in prod we have the same svg embedded more than once)
//         if (node.attributes?.id) {
//           const idValue = node.attributes.id;

//           delete node.attributes.id;

//           node.attributes.class = node.attributes.class
//             ? `${node.attributes.class} ${idValue}`
//             : `${idValue}`;
//         }

//         // Update url(#id) references to match prefixed class IDs
//         /*if (node.attributes) {
//           for (const key of Object.keys(node.attributes)) {
//             const attr = node.attributes[key];

//             if (typeof attr === "string") {
//               node.attributes[key] = attr.replace(
//                 /url\(#(.*?)\)/g,
//                 (_, idRef) => `url(#${prefix}${idRef})`
//               );
//             }
//           }
//         }*/

//         // 5Namespace gradient IDs
//         /*if (node.attributes?.id && node.name?.includes("Gradient")) {
//           node.attributes.id = `${prefix}${node.attributes.id}`;
//         }*/

//         // recurse
//         node.children?.forEach(walk);
//       };

//       ast.children.forEach(walk);

//       return ast;
//     },
//   };
// }
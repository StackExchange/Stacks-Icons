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
    [iconName: string]:| string | Record<string, string>;
}

// Helper for dealing with Figma component variants
// Expects something like "Size=20, Style=Fill"
export function flattenFigmaComponentVarientName(name: string): string {
    return name // Format will be Property=Value, ...
        .split(",") // split by commas ['Prop=Val', ...]
        .map(
            (i) =>
                i
                    .split("=")[1] // split by = and take the right side as Figma UI does
                    ?.replace(/\s+/g, "") // trim any whitespace
                    .trim() || ""
        )
        .join("")
        .replace(/Default/g, "") // any values using default are flattened
}

export function flattenDefinitions(defs: Definitions): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [iconName, iconValue] of Object.entries(defs)) {
        if (typeof iconValue === "string") {
            out[iconName] = iconValue;
        } else {
            for (const [variant, hash] of Object.entries(iconValue)) {
                const flattened = flattenFigmaComponentVarientName(variant);
                out[iconName + flattened] = hash;
            }
        }
    }

    return out;
}

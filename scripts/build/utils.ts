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

interface Definitions {
    [iconName: string]: string | Record<string, string>;
}

const DEFAULT_SIZE = "24";

export function flattenDefinitions(defs: Definitions): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [iconName, iconValue] of Object.entries(defs)) {
        if (typeof iconValue === "string") {
            // Spots are just strings (e.g., "Spot/Test": "hash")
            out[iconName] = iconValue;
        } else {
            // Icons now have structure: "Icon/Answer": { "Duotone": "hash", "Fill": "hash", ... }
            // We need to map this to Figma component names which include size
            // e.g., "Icon/Answer24Duotone" for Figma lookup
            for (const [variant, hash] of Object.entries(iconValue)) {
                out[`${iconName}${DEFAULT_SIZE}${variant}`] = hash;
            }
        }
    }

    return out;
}

/**
 * Strips the default size from icon names for the final export
 * e.g., "Answer24Duotone" -> "AnswerDuotone"
 * Spots are not affected
 */
export function stripDefaultSize(name: string, type: OutputType): string {
    if (type === "Icon") {
        // Match pattern like "Answer24Duotone" and strip the "24"
        return name.replace(
            new RegExp(`${DEFAULT_SIZE}(?=Duotone|Fill|Outline)`),
            ""
        );
    }
    return name;
}

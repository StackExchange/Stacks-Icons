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
    [iconName: string]: string | Record<string, Record<string, string>>;
}

export function flattenDefinitions(defs: Definitions): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [iconName, iconValue] of Object.entries(defs)) {
        if (typeof iconValue === "string") {
            out[iconName] = iconValue;
        } else {
            for (const [size, variants] of Object.entries(iconValue)) {
                for (const [variant, hash] of Object.entries(variants)) {
                    out[`${iconName}${size}${variant}`] = hash;
                }
            }
        }
    }

    return out;
}

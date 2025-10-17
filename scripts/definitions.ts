import path from "path";
import YAML from "yaml";
import { flattenDefinitions } from "./build/utils.js";
import { readFile } from "fs/promises";

export interface Config {
    definitions: Record<
        string, // icon name (e.g., "Icon/Answer" or "Spot/Test")
        string | Record<string, string> // hash for spots, or variant → hash for icons
    >;
    cssIcons: string[];
}

const configPath = path.resolve(
    process.cwd(),
    process.env["ASSET_CONFIG_PATH"] || "./config.yaml"
);

const configFile = await readFile(configPath, "utf-8");
const config = YAML.parse(configFile) as Config;

export const cssIcons = config.cssIcons || {};

export const definitions = flattenDefinitions(config.definitions);

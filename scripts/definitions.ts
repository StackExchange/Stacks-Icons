import path from "path";
import YAML from "yaml";
import { flattenDefinitions, type Definitions } from "./build/utils.js";
import { readFile } from "fs/promises";

export interface Config {
    definitions: Definitions;
    cssIcons: Record<string, { css: string }>;
}

const configPath = path.resolve(
    process.cwd(),
    process.env["ASSET_CONFIG_PATH"] || "./config.yaml"
);

const configFile = await readFile(configPath, "utf-8");

export const configRaw = YAML.parse(configFile) as Config;

export const cssIcons = configRaw.cssIcons || {};

export const definitions = flattenDefinitions(configRaw.definitions);

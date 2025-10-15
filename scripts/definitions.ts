import path from 'path';
import YAML from 'yaml'
import { flattenDefinitions } from './build/utils.js';
import { readFile } from 'fs/promises';

export interface Config {
  definitions: Record<
    string, // icon name
    Record<
      string, // size
      Record<string, string> // variant → hash
    >
  >;
  cssIcons: Record<string, { css: string }>;
}

const configPath = path.resolve(
  process.cwd(),
  process.env['ASSET_CONFIG_PATH'] || './config.yaml'
);

const configFile = await readFile(configPath, 'utf-8');
const config: Config = YAML.parse(configFile);

export const cssIcons = config.cssIcons || {};

export const definitions = flattenDefinitions(
    config.definitions,
) as Record<string, string>;
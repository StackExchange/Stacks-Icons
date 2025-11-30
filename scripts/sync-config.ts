import * as dotenv from "dotenv";
import axios from "axios";
import { createHash } from "node:crypto";
import YAML, { Document } from "yaml";
import { readFile, writeFile } from "fs/promises";
import {
    error,
    success,
    info,
    warn,
    flattenFigmaComponentVariantName,
} from "./build/utils.js";
import { GetImagesResponse, type GetFileComponentsResponse } from "@figma/rest-api-spec";


// load environmental variables from the .env file
dotenv.config();

interface VariantGroup {
    [variant: string]: string; // variant name -> hash
}

interface Definitions {
    [componentName: string]: string | VariantGroup;
}

interface Config {
    cssIcons?: Record<string, { css: string }>;
    definitions: Definitions;
}

async function syncConfigFromFigma() {
    if (!process.env["FIGMA_ACCESS_TOKEN"] || !process.env["FIGMA_FILE_KEY"]) {
        throw new Error(
            "Please check for env variables for FIGMA_ACCESS_TOKEN and FIGMA_FILE_KEY."
        );
    }

    // Read existing config to preserve everything
    const configPath = "./config.yaml";
    const existingConfigRaw = await readFile(configPath, "utf-8");
    const existingConfig = YAML.parse(existingConfigRaw) as Config;

    info("Loaded existing config.yaml");

    // https://www.figma.com/developers/api
    const fetch = axios.create({
        baseURL: "https://api.figma.com/v1",
        headers: { "X-Figma-Token": process.env["FIGMA_ACCESS_TOKEN"] },
    });

    info(
        `Fetching all components from Figma ("https://figma.com/design/${process.env["FIGMA_FILE_KEY"]}")...`
    );

    // Fetch components metadata
    const stacksFile = await fetch.get<GetFileComponentsResponse>(`/files/${process.env["FIGMA_FILE_KEY"]}/components`);

    const components = stacksFile.data.meta.components;
    info(`Found ${components.length} components in Figma`);

    // Build a map of what exists in Figma
    interface FigmaEntry {
        nodeId: string;
        componentName: string;
        variantName: string | null;
        flattenedName: string; // Full name as it appears in definitions
    }

    const figmaComponents: FigmaEntry[] = [];

    for (const component of components) {
        const nodeId = component.node_id;
        let componentName = component.name;
        let variantName: string | null = null;
        let flattenedName = componentName;

        // Check if this is a variant within a component set
        if (component.containing_frame?.name) {
            componentName = component.containing_frame.name;
            variantName = component.name;
            const flattened = flattenFigmaComponentVariantName(variantName);
            flattenedName = `${componentName}${flattened}`;
        }

        figmaComponents.push({
            nodeId,
            componentName,
            variantName,
            flattenedName,
        });
    }

    // Fetch SVGs and calculate hashes only for missing components
    const nodeIds = figmaComponents.map((c) => c.nodeId);
    const urls = await fetch.get<GetImagesResponse>(
        `/images/${process.env["FIGMA_FILE_KEY"]}`,
        {
            params: {
                format: "svg",
                ids: nodeIds.join(","),
                svg_include_id: true,
            },
        }
    );

    info(`Fetching ${nodeIds.length} SVG files to calculate hashes...`);

    const hashMap = new Map<string, string>();
    const queue: Promise<void>[] = [];

    for (const [nodeId, url] of Object.entries(urls.data.images)) {
        if (!url) continue;

        queue.push(
            axios
                .get<string>(url)
                .then((resp) => {
                    info(`Fetching: ${url}`)
                    const hash = createHash("sha256");
                    hash.update(resp.data);
                    const sha256 = hash.digest("base64");
                    hashMap.set(nodeId, sha256);
                })
                .catch((err) => {
                    error(`Failed to fetch ${nodeId}: ${err}`);
                })
        );
    }

    await Promise.all(queue);
    info(`Successfully calculated ${hashMap.size} hashes`);

    // Add missing components to the existing definitions
    const updatedDefinitions = { ...existingConfig.definitions };

    for (const c of figmaComponents) {
        const { nodeId, componentName, variantName } = c;
        const hash = hashMap.get(nodeId);

        if (!hash) {
            warn(`Skipping ${componentName}${variantName ? ` (${variantName})` : ""} - no hash calculated`);
            continue;
        }

        if (variantName) {
            // Add to variant group
            const existing = updatedDefinitions[componentName];
            if (typeof existing === "object") {
                // Group already exists, add this variant
                existing[variantName] = hash;
            } else {
                // Create new group
                updatedDefinitions[componentName] = {
                    [variantName]: hash,
                };
            }
            info(`Added ${componentName} → ${variantName}`);
        } else {
            // Simple component
            updatedDefinitions[componentName] = hash;
            info(`Added ${componentName}`);
        }
    }

    // Update the config object
    const updatedConfig = {
        cssIcons: existingConfig.cssIcons,
        definitions: updatedDefinitions,
    };

    // Create a YAML Document to add comments
    const doc = new Document(updatedConfig);

    // Add MARK comments to group items
    const definitions = doc.get("definitions") as any;

    if (definitions && definitions.items) {
        const sortedKeys = [...definitions.items].sort((a, b) => {
            const keyA = String(a.key);
            const keyB = String(b.key);
            return keyA.localeCompare(keyB);
        });

        // Reorder the items
        definitions.items = sortedKeys;

        let currentGroup = "";

        for (const pair of sortedKeys) {
            const group = String(pair.key).split('/')[0]

            // Add MARK comment when group changes
            if (group && group !== currentGroup) {
                pair.key.commentBefore = ` MARK: ${group}`;
                pair.key.spaceBefore = true;
                currentGroup = group;
            }
        }
    }

    // Add MARK comment for cssIcons
    const cssIcons = doc.get("cssIcons");
    if (cssIcons) {
        (cssIcons as any).commentBefore = " MARK: CSS Icons";
        (cssIcons as any).spaceBefore = true;
    }

    const yamlString = doc.toString({
        indent: 4,
        lineWidth: 0,
    });

    await writeFile(configPath, yamlString, "utf-8");

    success(
        `Successfully refreshed ${figmaComponents.length} components to config.yaml`
    );
}

// Run the script
syncConfigFromFigma().catch((err) => {
    error(err);
    process.exit(1);
});

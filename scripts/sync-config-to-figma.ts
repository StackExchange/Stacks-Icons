import * as dotenv from "dotenv";
import axios from "axios";
import { createHash } from "node:crypto";
import YAML from "yaml";
import { readFile, writeFile } from "fs/promises";
import {
    error,
    success,
    info,
    warn,
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

    // Read existing config - this is the master source
    const configPath = "./config.yaml";
    const existingConfigRaw = await readFile(configPath, "utf-8");
    const doc = YAML.parseDocument(existingConfigRaw);
    const existingConfig = doc.toJSON() as Config;

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

    // Build a map of Figma components by name for lookup
    interface FigmaComponent {
        nodeId: string;
        componentName: string;
        variantName: string | null;
    }

    const figmaByName = new Map<string, FigmaComponent>();

    for (const component of components) {
        const nodeId = component.node_id;
        let componentName = component.name;
        let variantName: string | null = null;

        // Check if this is a variant within a component set
        if (component.containing_frame?.name) {
            componentName = component.containing_frame.name;
            variantName = component.name;
        }

        const key = variantName
            ? `${componentName}::${variantName}`
            : componentName;

        figmaByName.set(key, {
            nodeId,
            componentName,
            variantName,
        });
    }

    // Collect node IDs that we need to fetch hashes for
    const nodesToFetch: Array<{ nodeId: string; key: string }> = [];

    for (const [componentName, value] of Object.entries(existingConfig.definitions)) {
        if (typeof value === "string") {
            // Simple component
            const figmaComponent = figmaByName.get(componentName);
            if (figmaComponent) {
                nodesToFetch.push({ nodeId: figmaComponent.nodeId, key: componentName });
            } else {
                warn(`Component "${componentName}" not found in Figma`);
            }
        } else if (value != null) {
            // Variant group
            for (const variantName of Object.keys(value)) {
                const key = `${componentName}::${variantName}`;
                const figmaComponent = figmaByName.get(key);
                if (figmaComponent) {
                    nodesToFetch.push({ nodeId: figmaComponent.nodeId, key });
                } else {
                    warn(`Variant "${componentName} → ${variantName}" not found in Figma`);
                }
            }
        }
    }

    if (nodesToFetch.length === 0) {
        warn("No components found to sync");
        return;
    }

    // Fetch SVGs and calculate hashes
    const nodeIds = nodesToFetch.map((n) => n.nodeId);
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

    // Update hashes in the definitions
    const definitions = doc.get("definitions") as any;
    let updatedCount = 0;

    for (const { nodeId, key } of nodesToFetch) {
        const hash = hashMap.get(nodeId);
        if (!hash) {
            warn(`No hash calculated for ${key}`);
            continue;
        }

        if (key.includes("::")) {
            // Variant
            const [componentName, variantName] = key.split("::");
            const componentDef = definitions.get(componentName);
            if (componentDef && typeof componentDef === "object") {
                const oldHash = componentDef.get(variantName);
                if (oldHash !== hash) {
                    componentDef.set(variantName, hash);
                    info(`Updated ${componentName} → ${variantName}`);
                    updatedCount++;
                }
            }
        } else {
            // Simple component
            const oldHash = definitions.get(key);
            if (oldHash !== hash) {
                definitions.set(key, hash);
                info(`Updated ${key}`);
                updatedCount++;
            }
        }
    }

    // Write the updated config back
    const yamlString = doc.toString();
    await writeFile(configPath, yamlString, "utf-8");

    success(
        `Successfully synced ${nodesToFetch.length} components (${updatedCount} updated) to config.yaml`
    );
}

// Run the script
syncConfigFromFigma().catch((err) => {
    error(err);
    process.exit(1);
});

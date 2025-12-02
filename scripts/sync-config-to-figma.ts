import * as dotenv from "dotenv";
import axios from "axios";
import { createHash } from "node:crypto";
import YAML from "yaml";
import { readFile, writeFile } from "fs/promises";
import { error, success, info, warn } from "./build/utils.js";
import {
    GetImagesResponse,
    type GetFileComponentsResponse,
} from "@figma/rest-api-spec";

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
    const stacksFile = await fetch.get<GetFileComponentsResponse>(
        `/files/${process.env["FIGMA_FILE_KEY"]}/components`
    );

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
        if (component.containing_frame?.containingComponentSet?.name) {
            componentName =
                component.containing_frame?.containingComponentSet.name;
            variantName = component.name;
        }

        const key = variantName
            ? `${componentName}::${variantName}`
            : componentName;

        figmaByName.set(key, {
            componentName,
            nodeId,
            variantName,
        });
    }

    // Collect node IDs that we need to fetch hashes for
    const nodesToFetch: Array<{ nodeId: string; key: string }> = [];

    for (const [componentName, value] of Object.entries(
        existingConfig.definitions
    )) {
        if (typeof value === "string") {
            // Simple component
            const figmaComponent = figmaByName.get(componentName);
            if (figmaComponent) {
                nodesToFetch.push({
                    key: componentName,
                    nodeId: figmaComponent.nodeId,
                });
            } else {
                warn(`Component "${componentName}" not found in Figma`);
            }
        } else if (value != null) {
            // Variant group - fetch ALL variants from Figma for this component
            let variantCount = 0;
            for (const [key, figmaComponent] of figmaByName) {
                if (
                    figmaComponent.componentName === componentName &&
                    figmaComponent.variantName
                ) {
                    nodesToFetch.push({ key, nodeId: figmaComponent.nodeId });
                    variantCount++;
                }
            }
            if (variantCount > 0) {
                info(
                    `Found ${variantCount} variants for ${componentName} in Figma`
                );
            } else {
                warn(
                    `No variants found in Figma for component "${componentName}"`
                );
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
                .catch((err: unknown) => {
                    error(`Failed to fetch ${nodeId}: ${String(err)}`);
                })
        );
    }

    await Promise.all(queue);
    info(`Successfully calculated ${hashMap.size} hashes`);

    // Update hashes in the definitions - only update what changed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const definitions = doc.get("definitions") as any;

    // Track updates by component for organized output
    interface UpdateInfo {
        componentName: string;
        isVariantSet: boolean;
        updatedVariants: string[];
    }
    const updates: UpdateInfo[] = [];

    // Group updates by component to handle variant replacements
    const componentUpdates = new Map<string, Map<string, string>>();

    for (const { nodeId, key } of nodesToFetch) {
        const hash = hashMap.get(nodeId);
        if (!hash) {
            warn(`No hash calculated for ${key}`);
            continue;
        }

        if (key.includes("::")) {
            // Variant
            const parts = key.split("::");
            const componentName = parts[0];
            const variantName = parts[1];
            if (!componentName || !variantName) {
                warn(`Invalid variant key: ${key}`);
                continue;
            }
            if (!componentUpdates.has(componentName)) {
                componentUpdates.set(componentName, new Map());
            }
            const componentUpdate = componentUpdates.get(componentName);
            if (componentUpdate) {
                componentUpdate.set(variantName, hash);
            }
        } else {
            // Simple component
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const oldHash = definitions.get(key);
            if (oldHash !== hash) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                definitions.set(key, hash);
                updates.push({
                    componentName: key,
                    isVariantSet: false,
                    updatedVariants: [],
                });
            }
        }
    }

    // Apply variant updates - only update variants that changed
    const componentNames = Array.from(componentUpdates.keys());
    for (let i = 0; i < componentNames.length; i++) {
        const componentName = componentNames[i];
        if (!componentName) continue;

        const variants = componentUpdates.get(componentName);
        if (!variants) continue;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const componentDef = definitions.get(componentName);
        if (
            componentDef &&
            typeof componentDef === "object" &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            componentDef.items
        ) {
            const updatedVariants: string[] = [];

            // Check each variant for changes
            for (const [variantName, newHash] of variants) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                const oldHash = componentDef.get(variantName);
                if (oldHash !== newHash) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    componentDef.set(variantName, newHash);
                    updatedVariants.push(variantName);
                }
            }

            // Track if any variants were updated for this component
            if (updatedVariants.length > 0) {
                updates.push({
                    componentName,
                    isVariantSet: true,
                    updatedVariants,
                });
            }
        }
    }

    // Write the updated config back if there were changes
    if (updates.length > 0) {
        const yamlString = doc.toString();
        await writeFile(configPath, yamlString, "utf-8");

        // Display updated components in tree format
        for (const update of updates) {
            if (update.isVariantSet) {
                info(update.componentName);
                for (const variant of update.updatedVariants) {
                    info(`    └ ${variant}`);
                }
            } else {
                info(`Set ${update.componentName}`);
            }
        }

        success(
            `Successfully updated ${updates.length} component${updates.length !== 1 ? "s" : ""} in config.yaml`
        );
    } else {
        success("All components are up to date");
    }
}

// Run the script
syncConfigFromFigma().catch((err) => {
    error(err);
    process.exit(1);
});

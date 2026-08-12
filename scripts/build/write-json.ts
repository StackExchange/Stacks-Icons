import { promises as fs } from "fs";
import packageJson from "../../package.json" with { type: "json" };
import { configRaw } from "../config.js";
import { paths } from "./paths.js";
import { flattenFigmaComponentVariantName, type OutputType } from "./utils.js";
import type { GetFileComponentsResponse } from "@figma/rest-api-spec";

type FigmaComponent = GetFileComponentsResponse["meta"]["components"][number];

function parseVariantProps(variantKey: string): Record<string, string> {
    return Object.fromEntries(
        variantKey.split(",").map((pair) => {
            const [k, v] = pair
                .trim()
                .split("=")
                .map((s) => s.trim());
            return [k ?? pair.trim(), v ?? ""];
        })
    );
}

function figmaUrl(nodeId: string): string {
    const fileKey = process.env["FIGMA_FILE_KEY"] ?? "";
    return `https://www.figma.com/design/${fileKey}/?node-id=${nodeId.replace(/:/g, "-")}`;
}

interface ManifestVariant {
    /** Flattened build key e.g. "Alert16Fill" */
    key: string;
    /** Parsed variant properties e.g. { Size: "16", Style: "Fill" } */
    variantProps: Record<string, string> | null;
    figmaNodeId: string;
    figmaUrl: string;
    /** Stable Figma component key — use with the Figma API to always resolve this component */
    figmaComponentKey: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    svg: string;
}

interface ManifestDimension {
    key: string;
    values: string[];
}

interface ManifestEntry {
    /** Base name e.g. "Alert" */
    name: string;
    /** Full Figma name e.g. "Icon/Alert" */
    figmaName: string;
    isSpot: boolean;
    /** Description from the Figma component set */
    description: string;
    /** Dimensions with >1 value, sorted Default-first then alphanumeric */
    dimensions: ManifestDimension[];
    /** Variants sorted so the default (Size=Default, Style=Default) is first */
    variants: ManifestVariant[];
}

function sortVariantValue(a: string, b: string): number {
    if (a === "Default") return -1;
    if (b === "Default") return 1;
    return a.localeCompare(b, undefined, { numeric: true });
}

function computeDimensions(variants: ManifestVariant[]): ManifestDimension[] {
    const allKeys = new Set<string>();
    for (const v of variants) {
        if (v.variantProps)
            Object.keys(v.variantProps).forEach((k) => allKeys.add(k));
    }
    const dims: ManifestDimension[] = [];
    for (const key of allKeys) {
        const values = [
            ...new Set(
                variants
                    .map((v) => v.variantProps?.[key])
                    .filter((v): v is string => Boolean(v))
            ),
        ].sort(sortVariantValue);
        if (values.length > 1) dims.push({ key, values });
    }
    return dims;
}

function sortVariants(variants: ManifestVariant[]): ManifestVariant[] {
    return [...variants].sort((a, b) => {
        // Count how many props are NOT "Default" — fewer non-defaults = more "default" variant
        const nonDefaultCount = (v: ManifestVariant) =>
            v.variantProps
                ? Object.values(v.variantProps).filter(
                      (val) => val !== "Default"
                  ).length
                : 0;
        return nonDefaultCount(a) - nonDefaultCount(b);
    });
}

function buildEntries(
    svgObj: Record<string, string>,
    type: OutputType,
    componentByFigmaName: Map<string, FigmaComponent>
): ManifestEntry[] {
    const result: ManifestEntry[] = [];
    const isSpot = type === "Spot";

    for (const [figmaName, variantDefs] of Object.entries(
        configRaw.definitions
    )) {
        if (!figmaName.startsWith(`${type}/`)) continue;

        const baseName = figmaName.slice(type.length + 1);
        const variants: ManifestVariant[] = [];

        if (typeof variantDefs === "string") {
            // Simple component — no variant properties
            const svg = svgObj[baseName];
            const component = componentByFigmaName.get(`${type}/${baseName}`);
            if (svg) {
                variants.push({
                    createdAt: component?.created_at ?? "",
                    description: component?.description ?? "",
                    figmaComponentKey: component?.key ?? "",
                    figmaNodeId: component?.node_id ?? "",
                    figmaUrl: component ? figmaUrl(component.node_id) : "",
                    key: baseName,
                    svg,
                    updatedAt: component?.updated_at ?? "",
                    variantProps: null,
                });
            }
        } else {
            // Variant group
            for (const variantKey of Object.keys(variantDefs)) {
                const flatName = flattenFigmaComponentVariantName(variantKey);
                const buildKey = baseName + flatName;
                const svg = svgObj[buildKey];
                const component = componentByFigmaName.get(
                    `${type}/${buildKey}`
                );
                if (svg) {
                    variants.push({
                        createdAt: component?.created_at ?? "",
                        description: component?.description ?? "",
                        figmaComponentKey: component?.key ?? "",
                        figmaNodeId: component?.node_id ?? "",
                        figmaUrl: component ? figmaUrl(component.node_id) : "",
                        key: buildKey,
                        svg,
                        updatedAt: component?.updated_at ?? "",
                        variantProps: parseVariantProps(variantKey),
                    });
                }
            }
        }

        if (variants.length > 0) {
            // Figma can contain equivalent default variants whose properties
            // flatten to the same public build key. Generated assets use the
            // last definition, so the manifest must expose that key once too.
            const uniqueVariants = [
                ...new Map(
                    variants.map((variant) => [variant.key, variant])
                ).values(),
            ];
            const sorted = sortVariants(uniqueVariants);
            const description =
                uniqueVariants
                    .map(
                        (v) =>
                            componentByFigmaName.get(`${type}/${v.key}`)
                                ?.description
                    )
                    .find((d) => d) ?? "";
            result.push({
                description,
                dimensions: computeDimensions(sorted),
                figmaName,
                isSpot,
                name: baseName,
                variants: sorted,
            });
        }
    }

    return result;
}

export async function writeManifest(
    iconsObj: Record<string, string>,
    spotsObj: Record<string, string>,
    figmaComponents: FigmaComponent[],
    /** nodeId → full Figma name e.g. "Icon/Alert16Fill" */
    figmaNames: Record<string, string>
) {
    // Map the typed build name (e.g. "Icon/Alert16Fill") to Figma metadata.
    const componentByFigmaName = new Map<string, FigmaComponent>();
    for (const component of figmaComponents) {
        const figmaName = figmaNames[component.node_id];
        if (!figmaName) continue;
        componentByFigmaName.set(figmaName, component);
    }

    const manifest = {
        generatedAt: new Date().toISOString(),
        icons: buildEntries(iconsObj, "Icon", componentByFigmaName),
        spots: buildEntries(spotsObj, "Spot", componentByFigmaName),
        version: packageJson.version,
    };

    await fs.writeFile(
        paths.build("manifest.json"),
        JSON.stringify(manifest, null, 2),
        "utf8"
    );
}

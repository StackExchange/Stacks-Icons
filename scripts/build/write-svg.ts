import axios from "axios";
import fs from "fs/promises";
import { createHash } from "node:crypto";
import { basename } from "path";
import { optimize } from "svgo";
import { definitions, FIGMA_FILE_KEY } from "../definitions.js";
import { paths } from "./paths.js";
import { error, info, OutputType, warn } from "./utils.js";

/** The upper limit to an icon's svg size in bytes */
const MAX_ICON_SIZE_B = 4500;

// https://www.figma.com/developers/api#get-files-endpoint
export interface FigmaComponent {
    name: string;
    node_id: string;
    thumbnail_url: string;
    created_at: string;
    updated_at: string;
}

export const fetchFromFigma = async (ignoreHashMismatch: boolean) => {
    // https://www.figma.com/developers/api
    const fetch = axios.create({
        baseURL: "https://api.figma.com/v1",
        headers: { "X-Figma-Token": process.env["FIGMA_ACCESS_TOKEN"] },
    });

    // Get the Stacks icon file
    info(`Fetching all components from Figma (${FIGMA_FILE_KEY})...`);
    const stacksFile = await fetch.get<{
        meta: { components: FigmaComponent[] };
    }>(`/files/${FIGMA_FILE_KEY}/components`);

    // Full returned components list
    const components = stacksFile.data.meta.components;

    // {"2:18": "Icon/Foo", "7938:0": "Spot/Bar", ... }
    // mapping of node_id to component name
    const names: Record<string, string> = {};

    for (const component of components) {
        const name = component.name;
        const nodeId = component.node_id;

        // only fetch the images that are in the definitions file
        if (!(name in definitions)) {
            warn(`${name} found in Figma, but not in definitions`);
            continue;
        }

        names[nodeId] = component.name;
    }

    // double check that all definition entries were found in Figma
    const allRequestedDefs = Object.keys(definitions);
    const fetchedComponents = Object.values(names);
    for (const def of allRequestedDefs) {
        if (!fetchedComponents.includes(def)) {
            warn(`${def} found in definitions, but not in Figma`);
        }
    }

    // Returns a object of urls
    // https://www.figma.com/developers/api#get-images-endpoint
    // { "images": { "NODE_ID": "AWS URL", ... } }
    const urls = await fetch.get<{ images: Record<string, string> }>(
        `/images/${FIGMA_FILE_KEY}`,
        {
            params: { format: "svg", ids: Object.keys(names).join(",") },
        }
    );

    const queue: Promise<unknown>[] = [];
    const incorrectHashes: Record<string, string> = {};
    const images = Object.entries(urls.data.images);
    info(`Attempting to fetch ${images.length} files from Figma...`);

    // Loop over the object of images
    for (const entry of images) {
        const [node_id, url] = entry;
        const name = names[node_id];

        if (!name || !url) {
            error(
                `Unable to find name or url: name: "${String(
                    name
                )}", url: "${url}"`
            );
            continue;
        }

        const location = paths.src(`${name}.svg`);

        queue.push(
            axios
                .get<string>(url)
                .then((resp) => {
                    const data = resp.data;

                    // calculate the hash
                    const hash = createHash("sha256");
                    hash.update(data);
                    const sha256 = hash.digest("base64");

                    //debug(`💾 '${name}' (${url}) ${sha256}`);

                    if (definitions[name] === sha256) {
                        // write to file
                        return fs.writeFile(location, data);
                    } else {
                        incorrectHashes[name] = sha256;
                        // don't crash the process on a failed hash, resolve and error later
                        return Promise.resolve();
                    }
                })
                .catch((err) => {
                    error(err);
                })
        );
    }

    // wait for all the files to come back and be written to disk
    await Promise.all(queue);

    const hashEntries = Object.entries(incorrectHashes).sort((a, b) => {
        if (a < b) {
            return -1;
        }

        if (a > b) {
            return 1;
        }

        return 0;
    });

    if (hashEntries.length) {
        const mismatchError = `Hash mismatch on ${
            hashEntries.length
        } files. Expected hash values:
${hashEntries.reduce((p, [k, v]) => p + `"${k}": "${v}",\n`, "")}`;

        if (ignoreHashMismatch) {
            error(mismatchError);
        } else {
            throw mismatchError;
        }
    }

    return components;
};

/** Optimizes svg files using svgo then writes them to build/lib */
export async function processSvgFilesAsync(type: OutputType) {
    const ext = ".svg";
    // Read the source directory of SVGs
    let icons = await fs.readdir(paths.src(type));

    // Get the name without the extension and sort alphabetically
    icons = icons.map((i) => basename(i, ext)).sort();

    // Array of promises which do the fetching of the files
    const readPromises = icons.map((i) =>
        fs.readFile(paths.src(type, i + ext), "utf8")
    );
    let processed = await Promise.all(readPromises);

    const optimizedImages: string[] = [];

    // Optimize them with SVGO
    processed.forEach((i) => {
        try {
            const optimized = optimize(i, {
                multipass: true,
                floatPrecision: 2,
                plugins: [
                    {
                        name: "preset-default",
                        params: {
                            overrides: {
                                removeViewBox: false,
                                mergePaths: {
                                    force: true,
                                    noSpaceAfterFlags: true,
                                },
                            },
                        },
                    },
                    "removeXMLNS",
                    {
                        name: "removeAttrs",
                        params: {
                            attrs: "(fill-rule|clip-rule)",
                        },
                    },
                ],
            });
            optimizedImages.push(optimized.data);
        } catch (e) {
            error(e);
        }
    });

    const typeClass = type.toLowerCase();

    // Do our custom tweaks to the output
    processed = optimizedImages.map((i, idx) => {
        const icon = icons[idx];

        if (!icon) {
            return i;
        }

        return i
            .replace(
                "<svg",
                `<svg aria-hidden="true" class="svg-${typeClass} ${typeClass}${icon}"`
            ) // Add classes and aria-attributes since our source files don't have them
            .replace(/fill="#000"/gi, "") // Remove any fills so paths are colored by the parents' color
            .replace(/fill="none"/gi, "") // Remove any empty fills that SVGO's removeUselessStrokeAndFill: true doesn't remove
            .replace(/fill="#222426"/gi, 'fill="var(--black-800)"') // Replace hardcoded hex value with appropriate CSS variables
            .replace(/fill="#fff"/gi, 'fill="var(--white)"')
            .replace(/fill="#6A7E7C"/gi, 'fill="var(--black-500)"')
            .replace(/fill="#1A1104"/gi, 'fill="var(--black-900)"')
            .replace(
                /linearGradient id="(.*?)/gi,
                `linearGradient id="${icon}$1`
            ) // Replace any gradient ID with the icon name to namespace
            .replace(/url\(#(.*?)\)/gi, `url(#${icon}$1)`) // Replace any reference to fill IDs with the icon name to namespace
            .replace(/\s>/g, ">") // Remove extra space before closing bracket on opening svg element
            .replace(/\s\/>/g, "/>"); // Remove extra space before closing bracket on path tag element
    });

    // ensure the directory is created
    await fs.mkdir(paths.build("lib", type), {
        recursive: true,
    });

    // Make an object of our icons { IconName: '<svg>' }
    const iconsObj: Record<string, string> = {};
    const promises = processed.map(async (svgStr, idx) => {
        const iconName = icons[idx];
        if (!iconName) {
            return;
        }

        iconsObj[iconName] = svgStr;

        const path = paths.build(paths.build("lib", type), iconName + ext);

        // Save each svg
        await fs.writeFile(path, svgStr, "utf8");

        // only check the file size for icons
        if (type === "Icon") {
            const stat = await fs.stat(path);

            if (stat.size > MAX_ICON_SIZE_B) {
                throw `File too large: ${path}; ${stat.size} B > ${MAX_ICON_SIZE_B} B`;
            }
        }
    });

    const failed = (await Promise.allSettled(promises))
        .map((r) => (r.status === "rejected" ? (r.reason as string) : null))
        .filter((r) => !!r);

    if (failed.length) {
        throw failed.join("\n");
    }

    return { icons, iconsObj };
}

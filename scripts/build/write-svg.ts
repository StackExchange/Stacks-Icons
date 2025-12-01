import axios from "axios";
import fs from "fs/promises";
import { createHash } from "node:crypto";
import { basename } from "path";
import { optimize } from "svgo";
import { definitions } from "../config.js";
import { paths } from "./paths.js";
import {
    error,
    info,
    warn,
    flattenFigmaComponentVariantName,
    type OutputType,
    svgoPlugins,
} from "./utils.js";
import { type GetFileComponentsResponse, type GetImagesResponse } from '@figma/rest-api-spec'

/** The upper limit to an icon's svg size in bytes */
const MAX_ICON_SIZE_B = 4500;

export const fetchFromFigma = async (ignoreHashMismatch: boolean) => {
    if (!process.env["FIGMA_ACCESS_TOKEN"] || !process.env["FIGMA_FILE_KEY"]) {
        throw new Error(
            "Please check for env variables for FIGMA_ACCESS_TOKEN and FIGMA_FILE_KEY."
        );
    }

    // https://www.figma.com/developers/api
    const fetch = axios.create({
        baseURL: "https://api.figma.com/v1",
        headers: { "X-Figma-Token": process.env["FIGMA_ACCESS_TOKEN"] },
    });

    // Get the Stacks icon file
    info(
        `Fetching all components from Figma ("https://figma.com/design/${process.env["FIGMA_FILE_KEY"]}")...`
    );

    // https://developers.figma.com/docs/rest-api/component-endpoints/#http-endpoint-1
    const stacksFile = await fetch.get<GetFileComponentsResponse>(`/files/${process.env["FIGMA_FILE_KEY"]}/components`);

    // Full returned components list
    const components = stacksFile.data.meta.components;

    // {"2:18": "Icon/Foo", "7938:0": "Spot/Bar", ... }
    // mapping of node_id to component name
    const names: Record<string, string> = {};

    for (const component of components) {
        // Look for components with variants first, group them under the container name
        const nodeId = component.node_id;
        let name = component.name;

        // For variants, loop through all of them to create seperate assets
        if (component.containing_frame?.containingComponentSet?.name) {
            const componentName = component.containing_frame.containingComponentSet.name;
            const variantName = flattenFigmaComponentVariantName(
                component.name
            );

            name = `${componentName}${variantName}`;
        }

        // only fetch the images that are in the definitions file
        if (!(name in definitions)) {
            info(`"${name}" found in Figma, but not in definitions`);
            continue;
        }

        names[nodeId] = name;
    }

    // double check that all definition entries were found in Figma
    const allRequestedDefs = Object.keys(definitions);
    const fetchedComponents = Object.values(names);

    console.log(allRequestedDefs)
    console.log('------')
    console.log(fetchedComponents)

    for (const def of allRequestedDefs) {
        if (!fetchedComponents.includes(def)) {
            warn(`"${def}" found in definitions, but not in Figma`);
        }
    }

    // Returns a object of urls
    // https://www.figma.com/developers/api#get-images-endpoint
    // { "images": { "NODE_ID": "AWS URL", ... } }
    const urls = await fetch.get<GetImagesResponse>(
        `/images/${process.env["FIGMA_FILE_KEY"]}`,
        {
            params: { 
                format: "svg",
                ids: Object.keys(names).join(","),
                svg_include_id: true,
            },
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
${hashEntries.reduce((p, [k, v]) => p + `${k}: ${v}\n`, "")}`;

        if (ignoreHashMismatch) {
            info(mismatchError);
        } else {
            throw mismatchError;
        }
    }

    return components;
};

/** Optimizes svg files using svgo then writes them to build/lib */
export async function processSvgFilesAsync(type: OutputType) {
    const ext = ".svg";
    
    // Read the source files then remove the extensions and sort alphabetically
    let svgPaths = await fs.readdir(paths.src(type))
    let svgNames = svgPaths.map((i) => basename(i, ext)).sort();

    // Ensure the save directory is created
    await fs.mkdir(paths.build("lib", type), {
        recursive: true,
    });

    let svgPromises = svgPaths.map(async (i) => {
        const name = basename(i, ext)
        const outputPath = paths.build(paths.build("lib", type), name + ext)

        let outputSvg = ''
        let raw = await fs.readFile(paths.src(type, i), "utf8")
        let css = ''

        // Check to see if there is a .css file with the same name, load it if there is and embed it in the svg
        try {
            css = await fs.readFile(paths.src('animations', type + name + '.css'), 'utf8');
            if (css) {
                info(`[${type}${name}]: Applying found .css file.`)
                raw = raw.replace(/(<svg[^>]*>)/, `$1<style type="text/css">${css}</style>`);
            }
            
        } catch (e: any) {
            // Ignore if CSS doesn't exist
            if (e.code !== 'ENOENT') throw e;
        }

        // Optimize it
        try {
            outputSvg = optimize(raw, {
                floatPrecision: 2,
                multipass: true,
                plugins: svgoPlugins(type, name, css ? true : false),
            }).data;
        } catch (e) {
            error(e);
        }
        
        // Save each svg
        await fs.writeFile(outputPath, outputSvg, "utf8");

        // only check the file size for icons
        if (type === "Icon") {
            const stat = await fs.stat(outputPath);

            if (stat.size > MAX_ICON_SIZE_B) {
                throw `File too large: ${outputPath}; ${stat.size} B > ${MAX_ICON_SIZE_B} B`;
            }
        }


        return { [name]: outputSvg }
    })

    const svgs = await Promise.all(svgPromises);
    const iconsObj: Record<string, string> = Object.assign({}, ...svgs);

    return { svgNames, iconsObj };
}

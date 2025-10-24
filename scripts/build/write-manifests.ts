import { promises as fs } from "fs";
import { paths } from "./paths.js";
import { configRaw } from "../definitions.js";
import { flattenFigmaComponentVariantName } from "./utils.js"

function buildCssManifestHtml(
    iconsObj: {
        name: string;
        css: string | null;
    }[]
) {
    return iconsObj
        .map((i) => {
            return `<div>
  ${i.name}
  <br/>
  <span class="svg-icon-bg icon${i.name}"></span>
  </div>`;
        })
        .join("\n\n");
}

function buildIconManifestHtml(iconsObj: any) {
    const grouped: any = {};

    for (const [figmaKey, variants] of Object.entries((configRaw.definitions))) {
        if (!figmaKey.startsWith("Icon/")) continue;

        const baseName = String(figmaKey).replace(/^Icon\//, "");

        if (!grouped[baseName]) grouped[baseName] = {};

        for (const [variantKey] of Object.entries(variants as any)) {
            const flatName = flattenFigmaComponentVariantName(String(variantKey));
            const iconName = baseName + (flatName ? flatName : "");
            const svg = (iconsObj as any)[iconName];

            if (svg) {
                grouped[baseName][baseName + flatName] = String(svg);
            }
        }
    }

    const html = Object.entries(grouped as any)
        .map(([baseName, variants]: any) => {
            const variantsHtml = Object.entries(variants as any)
                .map(([variantName, svg]: any) => {
                    return `
                        <div class="icon-variant bb bc-black-200 py4">
                            <span class="fs-fine ff-mono fc-light pb12">${variantName}</span>
                            <div class="icon-preview">${String(svg)}</div>
                        </div>
                    `;
                })
                .join("\n");

            return `
                <div class="icon-group">
                    <h3 class="icon-title bb bc-black-500 pb8">${baseName}</h3>
                    <div class="icon-grid">${variantsHtml}</div>
                </div>
            `;
        })
        .join("\n");

    return html;
}

export function buildSpotManifestHtml(iconsObj: Record<string, string>) {
    return Object.entries(iconsObj)
        .map(
            ([key, value]) =>
                `<div class="ta-center">
            <span class="fc-light">${key}</span>
            <div class="mt12">${value.replace(
                `class="`,
                `class="native `
            )}</div>
          </div>`
        )
        .join("\n");
}

export async function writeManifests(
    icons: Record<string, string>,
    spots: Record<string, string>,
    cssIconsObj: {
        name: string;
        css: string | null;
    }[]
) {
    // Output the HTML manifest
    const builtCss = await fs.readFile(paths.build("icons.css"), "utf8");
    let htmlOut = await fs.readFile(paths.src("index.html"), "utf8");
    htmlOut = htmlOut
        .replace("{ICONS_MANIFEST}", buildIconManifestHtml(icons))
        .replace("{SPOTS_MANIFEST}", buildSpotManifestHtml(spots))
        .replace("{CSS_MANIFEST}", buildCssManifestHtml(cssIconsObj))
        .replace("{CSS_STYLES}", `<style>${builtCss}</style>`);
    const p1 = fs.writeFile(paths.preview("index.html"), htmlOut, "utf8");

    // output the TS types
    const p2 = await fs.writeFile(
        paths.build("index.d.ts"),
        (
            await Promise.all(
                [
                    paths.src("js/global.d.ts"),
                    paths.build("icons.d.ts"),
                    paths.build("spots.d.ts"),
                ].map((f) => fs.readFile(f, "utf8"))
            )
        ).join("\n\n"),
        "utf8"
    );

    return Promise.all([p1, p2]);
}

import { promises as fs } from "fs";
import svgToMiniDataURI from "mini-svg-data-uri";
import { cssIcons } from "../definitions.js";
import { paths } from "./paths.js";

const DEFAULT_SIZE = "24";

/**
 * Adds the default size back to icon names for reading source files from Figma
 * e.g., "AnswerDuotone" -> "Answer24Duotone"
 */
function addDefaultSize(name: string): string {
    // Match pattern and insert "24" before the variant
    return name.replace(/(Duotone|Fill|Outline)$/, `${DEFAULT_SIZE}$1`);
}

export async function bundleCssIcons() {
    const iconData = cssIcons.map((name) => ({
        name,
    }));

    const allIconSvgStrings = await Promise.all(
        iconData.map(async (i) => {
            // Add the default size back to read from the Figma-downloaded file
            const sourceFileName = addDefaultSize(i.name);
            return fs.readFile(
                paths.src("Icon", sourceFileName + ".svg"),
                "utf8"
            );
        })
    );

    if (iconData.length !== allIconSvgStrings.length) {
        throw "Unable to bundle css icons - unable to load some svgs";
    }

    const iconCss = iconData
        .map((data, i) => {
            // load the original source file - the optimized versions don't always work quite right
            const svgString = allIconSvgStrings[i];

            if (!svgString) {
                return `/* Unable to find icon ${data.name} */`;
            }

            // transform the svg file string into a data uri
            const svgDataUri = svgToMiniDataURI(svgString);

            // create the css class
            const outputCss = `.svg-icon-bg.icon${data.name} {
    --bg-icon: url("${svgDataUri}");
}`;

            // strip any empty lines and return the output
            return outputCss.replace(/\n\s*$/gm, "");
        })
        .join("\n\n");

    // copy over the icons.core.css file to dist/
    await fs.copyFile(
        paths.src("icons.core.css"),
        paths.build("icons.core.css")
    );

    // read in the base icons.backgrounds.css file, add our icons and write to dist/
    let cssFile = await fs.readFile(paths.src("icons.backgrounds.css"), "utf8");
    cssFile += "\n\n" + iconCss;
    await fs.writeFile(paths.build("icons.backgrounds.css"), cssFile, "utf8");

    return iconData;
}

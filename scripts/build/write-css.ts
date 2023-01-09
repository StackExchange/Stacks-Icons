import { promises as fs } from "fs";
import svgToMiniDataURI from "mini-svg-data-uri";
import { cssIcons } from "../definitions.js";
import { paths } from "./paths.js";

export async function bundleCssIcons() {
    const iconData: {
        name: string;
        css: string | null;
    }[] = cssIcons
        .map((i) => (typeof i === "string" ? { name: i, css: null } : i))
        .sort((a, b) => (a.name > b.name ? 1 : -1));

    const allIconSvgStrings = await Promise.all(
        iconData.map(async (i) =>
            fs.readFile(paths.src("Icon", i.name + ".svg"), "utf8")
        )
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
    ${data.css || ""}
}`;

            // strip any empty lines and return the output
            return outputCss.replace(/\n\s*$/gm, "");
        })
        .join("\n\n");

    // read in the base css file, add our icons and write to build/
    let cssFile = await fs.readFile(paths.src("icons.css"), "utf8"); // TODO
    cssFile += "\n\n" + iconCss;
    await fs.writeFile(paths.build("icons.css"), cssFile, "utf8"); // TODO

    return iconData;
}

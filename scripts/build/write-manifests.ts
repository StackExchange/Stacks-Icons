import concat from "concat";
import { promises as fs } from "fs";
import { paths } from "./paths.js";

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
  <span class="svg-icon-bg icon${i.name} native"></span>
  </div>`;
    })
    .join("\n\n");
}

export function buildSvgManifestHtml(iconsObj: Record<string, string>) {
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
  let builtCss = await fs.readFile(paths.build("icons.css"), "utf8");
  let htmlOut = await fs.readFile(paths.src("index.html"), "utf8");
  htmlOut = htmlOut
    .replace("{ICONS_MANIFEST}", buildSvgManifestHtml(icons))
    .replace("{SPOTS_MANIFEST}", buildSvgManifestHtml(spots))
    .replace("{CSS_MANIFEST}", buildCssManifestHtml(cssIconsObj))
    .replace("{CSS_STYLES}", `<style>${builtCss}</style>`);
  const p1 = fs.writeFile(paths.preview("index.html"), htmlOut, "utf8");

  // output the TS types
  const p2 = concat(
    [
      paths.src("js/global.d.ts"),
      paths.build("icons.d.ts"),
      paths.build("spots.d.ts"),
    ],
    paths.build("index.d.ts")
  );

  return Promise.all([p1, p2]);
}

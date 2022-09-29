import rollupTypescript from "@rollup/plugin-typescript";
import { program } from "commander";
import concat from "concat";
import { deleteAsync } from "del";
import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import svgToMiniDataURI from "mini-svg-data-uri";
import { basename } from "path";
import { rollup } from "rollup";
import { optimize } from "svgo";
import packageJson from "../package.json" assert { type: "json" };
import { cssIcons } from "./definitions.js";
import { fetchFromFigma } from "./fetch-figma-components.js";
import { Paths } from "./paths.js";
import { error, info, success } from "./utils.js";

// load environmental variables from the .env file
dotenv.config();

// check cli options
program
  .usage("[OPTIONS]...")
  .option("-c, --cached", "Use already downloaded images if they exist")
  .parse(process.argv);

const options = program.opts<{ cached: boolean }>();

const path = new Paths();

async function cleanBuildDirectoryAsync() {
  // Clear the existing built files
  await deleteAsync(path.build());
  await deleteAsync(path.preview());

  // Clear the downloads from Figma
  if (!options.cached) {
    await deleteAsync(path.src("Icon"));
    await deleteAsync(path.src("Spot"));
  }

  // Recreate the empty build folders
  await fs.mkdir(path.build());
  await fs.mkdir(path.preview());
}

type OutputType = "Spot" | "Icon";

/** Optimizes svg files using svgo then writes them to build/lib */
async function processSvgFilesAsync(type: OutputType) {
  const ext = ".svg";
  // Read the source directory of SVGs
  let icons = await fs.readdir(path.src(type));

  // Get the name without the extension and sort alphabetically
  icons = icons.map((i) => basename(i, ext)).sort();

  // Array of promises which do the fetching of the files
  const readPromises = icons.map((i) =>
    fs.readFile(path.src(type, i + ext), "utf8")
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

  var typeClass = type.toLowerCase();

  // Do our custom tweaks to the output
  processed = optimizedImages.map(
    (i, idx) =>
      i
        .replace(
          "<svg",
          `<svg aria-hidden="true" class="svg-${typeClass} ${typeClass}${icons[idx]}"`
        ) // Add classes and aria-attributes since our source files don't have them
        .replace(/fill="#000"/gi, "") // Remove any fills so paths are colored by the parents' color
        .replace(/fill="none"/gi, "") // Remove any empty fills that SVGO's removeUselessStrokeAndFill: true doesn't remove
        .replace(/fill="#222426"/gi, 'fill="var(--black-800)"') // Replace hardcoded hex value with appropriate CSS variables
        .replace(/fill="#fff"/gi, 'fill="var(--white)"')
        .replace(/fill="#6A7E7C"/gi, 'fill="var(--black-500)"')
        .replace(/fill="#1A1104"/gi, 'fill="var(--black-900)"')
        .replace(
          /linearGradient id="(.*?)/gi,
          `linearGradient id="${icons[idx]}$1`
        ) // Replace any gradient ID with the icon name to namespace
        .replace(/url\(#(.*?)\)/gi, `url(#${icons[idx]}$1)`) // Replace any reference to fill IDs with the icon name to namespace
        .replace(/\s>/g, ">") // Remove extra space before closing bracket on opening svg element
        .replace(/\s\/>/g, "/>") // Remove extra space before closing bracket on path tag element
  );

  // ensure the directory is created
  await fs.mkdir(path.build("lib", type), {
    recursive: true,
  });

  // Make an object of our icons { IconName: '<svg>' }
  let iconsObj: Record<string, string> = {};
  processed.forEach((svgStr, idx) => {
    const iconName = icons[idx];
    if (!iconName) {
      return;
    }

    iconsObj[iconName] = svgStr;

    // Save each svg
    fs.writeFile(
      path.build(path.build("lib", type), icons[idx] + ext),
      svgStr,
      "utf8"
    );
  });

  return { icons, iconsObj };
}

function writeRazor(icons: string[], type: OutputType) {
  // Output the Razor helper
  const csFile = path.root(
    "nuget/generated/Helper" + type + "s.g.cs"
  );
  let imagePath = "";
  const isSpot = type === "Spot";

  if (isSpot) {
    imagePath = 'folder: "../stacks-spots"';
  }

  const iconsOutput = icons
    .map(
      (i) =>
        `    public static SvgImage ${i} { get; } = GetImage(${imagePath});`
    )
    .join("\n");

  const csOutput = `namespace StackExchange.StacksIcons;
${isSpot ? "public static partial class Svg {" : ""}
public static partial class ${isSpot ? "Spot" : "Svg"}
{
${iconsOutput}
}
${isSpot ? "}" : ""}`;

  return fs.writeFile(csFile, csOutput, "utf8");
}

function writeEnums(icons: string[], type: OutputType) {
  // Output enums file
  const enumsFile = path.root("nuget/generated/" + type + "s.g.cs");
  const enumsOutput = `namespace StackExchange.StacksIcons;
public enum Stacks${type}
{
${icons.map((i) => `    ${i},`).join("\n")}
}`;

  return fs.writeFile(enumsFile, enumsOutput, "utf8");
}

function writeJson(iconsObj: Record<string, string>, type: OutputType) {
  // Output the JSON helper
  const jsonFile = path.build(type.toLowerCase() + "s.json");
  const jsonOutput = JSON.stringify(iconsObj, null, 2);

  return fs.writeFile(jsonFile, jsonOutput, "utf8");
}

function writeJsModule(iconsObj: Record<string, string>, type: OutputType) {
  // Output the js helper
  const modFile = path.build(type.toLowerCase() + "s.js");

  // output the TypeScript definitions
  const dtsFile = path.build(type.toLowerCase() + "s.d.ts");

  let jsOutput = "";
  let dtsOutput = "";

  Object.entries(iconsObj).forEach(([name, svg]) => {
    jsOutput += `export const ${type}${name} = "${svg.replace(
      /"/g,
      `\\"`
    )}";\n`;

    dtsOutput += `export const ${type}${name}: string;\n`;
  });

  dtsOutput = `declare module "${
    packageJson.name
  }/${type.toLowerCase()}s" {\n${dtsOutput}\n}`;

  return Promise.all([
    fs.writeFile(modFile, jsOutput, "utf8"),
    fs.writeFile(dtsFile, dtsOutput, "utf8"),
  ]);
}

function buildSvgManifestHtml(iconsObj: Record<string, string>) {
  return Object.entries(iconsObj)
    .map(
      ([key, value]) =>
        `<div class="ta-center">
          <span class="fc-light">${key}</span>
          <div class="mt12">${value.replace(`class="`, `class="native `)}</div>
        </div>`
    )
    .join("\n");
}

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

async function writeManifests(
  icons: Record<string, string>,
  spots: Record<string, string>,
  cssIconsObj: {
    name: string;
    css: string | null;
  }[]
) {
  // Output the HTML manifest
  let builtCss = await fs.readFile(path.build("icons.css"), "utf8");
  let htmlOut = await fs.readFile(path.src("index.html"), "utf8");
  htmlOut = htmlOut
    .replace("{ICONS_MANIFEST}", buildSvgManifestHtml(icons))
    .replace("{SPOTS_MANIFEST}", buildSvgManifestHtml(spots))
    .replace("{CSS_MANIFEST}", buildCssManifestHtml(cssIconsObj))
    .replace("{CSS_STYLES}", `<style>${builtCss}</style>`);
  const p1 = fs.writeFile(path.preview("index.html"), htmlOut, "utf8");

  // output the TS types
  const p2 = concat(
    [
      path.src("js/global.d.ts"),
      path.build("icons.d.ts"),
      path.build("spots.d.ts"),
    ],
    path.build("index.d.ts")
  );

  return Promise.all([p1, p2]);
}

async function buildSvgSetAsync(buildPrefix: OutputType) {
  let { icons, iconsObj } = await processSvgFilesAsync(buildPrefix);

  await Promise.all([
    writeRazor(icons, buildPrefix),
    writeEnums(icons, buildPrefix),
    writeJson(iconsObj, buildPrefix),
    writeJsModule(iconsObj, buildPrefix),
  ]);

  return { obj: iconsObj, count: icons.length };
}

async function bundleHelperJsAsync() {
  let bundle;
  const plugin = rollupTypescript({
    include: "**/src/js/*.ts",
  });

  try {
    // create the browser bundle
    bundle = await rollup({
      input: path.src("js/browser.ts"),
      plugins: [plugin],
    });
    await bundle.write({
      file: path.build("index.umd.js"),
      format: "umd",
      name: "StacksIcons",
    });

    // create the es6 bundle
    // create the browser bundle
    bundle = await rollup({
      input: path.src("js/index.ts"),
      plugins: [plugin],
    });
    await bundle.write({
      file: path.build("index.esm.js"),
      format: "esm",
      name: "StacksIcons",
    });
  } catch (e) {
    // do some error reporting
    error(e);
  }

  if (bundle) {
    // closes the bundle
    await bundle.close();
  }
}

async function bundleCssIcons() {
  const iconData: {
    name: string;
    css: string | null;
  }[] = cssIcons
    .map((i) => (typeof i === "string" ? { name: i, css: null } : i))
    .sort((a, b) => (a.name > b.name ? 1 : -1));

  const allIconSvgStrings = await Promise.all(
    iconData.map(async (i) =>
      fs.readFile(path.src("Icon", i.name + ".svg"), "utf8")
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
  var cssFile = await fs.readFile(path.src("icons.css"), "utf8"); // TODO
  cssFile += "\n\n" + iconCss;
  await fs.writeFile(path.build("icons.css"), cssFile, "utf8"); // TODO

  return iconData;
}

(async () => {
  if (!process.env["FIGMA_ACCESS_TOKEN"]) {
    throw `Unable to fetch icons from Figma without an access token;
Set "FIGMA_ACCESS_TOKEN" via an environment variable or with a .env file`;
  }

  await cleanBuildDirectoryAsync();

  // ensure the download directory is created
  await fs.mkdir(path.src("Icon"), { recursive: true });
  await fs.mkdir(path.src("Spot"), { recursive: true });

  const hasCachedIcons =
    (await fs.stat(path.src("Icon")))?.isDirectory() || false;
  if (!options.cached && hasCachedIcons) {
    await fetchFromFigma();
  } else {
    info("Skipping fetching from Figma...");
  }

  const { obj: iconsObj, count: iconsCount } = await buildSvgSetAsync("Icon");
  const { obj: spotsObj, count: spotsCount } = await buildSvgSetAsync("Spot");

  success(`Successfully built ${iconsCount} icons and ${spotsCount} spots`);

  await bundleHelperJsAsync();
  const cssIconsObj = await bundleCssIcons();

  success(`Successfully built helper JS and CSS`);

  await writeManifests(iconsObj, spotsObj, cssIconsObj);
  success(`Successfully built index.html`);
})().catch((e) => {
  error(e);
  process.exit(1);
});

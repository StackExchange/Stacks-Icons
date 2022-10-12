import rollupTypescript from "@rollup/plugin-typescript";
import concat from "concat";
import del from "del";
import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import svgToMiniDataURI from "mini-svg-data-uri";
import { Paths } from "./paths";
import { rollup } from "rollup";
import { optimize } from "svgo";
import packageJson from "../package.json";
import { cssIcons } from "./definitions";
import svgoConfig from "./svgo-config";
import { fetchFromFigma, FigmaComponent } from "./fetch-figma-components";
import { basename } from "path";

// load environmental variables from the .env file
dotenv.config();

const path = new Paths();

async function cleanBuildDirectoryAsync() {
  // Clear the existing built files
  await del(path.build());

  // Clear the downloads from figma
  await del(path.src("Icon"));
  await del(path.src("Spot"));

  // Recreate the empty src and build folders
  await fs.mkdir(path.build());
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

  // Optimize them with SVGO
  const optimizePromises = processed.map((i) => optimize(i, svgoConfig));
  const optimized = await Promise.all(optimizePromises);

  // Get the data from the SVGO object
  processed = optimized.map((i) => {
    if (i.error) {
      console.error(i.error);
    }

    if ("data" in i && i.data) {
      return i.data;
    }

    return "";
  });

  var typeClass = type.toLowerCase();

  // Do our custom tweaks to the output
  processed = processed.map(
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
  const csFile = path.build("Helper" + type + "s.cs");
  let imagePath = "";

  if (type === "Spot") {
    imagePath = 'folder: "../stacks-spots"';
  }

  const csOutput = icons
    .map(
      (i) => `public static SvgImage ${i} { get; } = GetImage(${imagePath});`
    )
    .join("\n");

  return fs.writeFile(csFile, csOutput, "utf8");
}

function writeEnums(icons: string[], type: OutputType) {
  // Output enums file
  const enumsFile = path.build(type + "s.cs");
  let enumsOutput = "public enum Icons\n{\n";
  enumsOutput += icons.map((i) => `    ${i},`).join("\n");
  enumsOutput += "\n}";

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

function writeHTML(iconsObj: Record<string, string>, type: OutputType) {
  // Output the HTML manifest
  const htmlFile = path.build(type.toLowerCase() + "s.html");
  let htmlOutput = `<h2 style="font-family: arial, sans-serif; font-size: 24px; text-align: center; margin-top: 64px;">${type}s Preview</h2>\n<div style="padding: 32px; display:grid; gap:32px; text-align: center; color: #666; font-family: arial, sans-serif; font-size: 12px; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));">\n`;

  for (let [key, value] of Object.entries(iconsObj)) {
    htmlOutput += `  <div>${key}<br><br>${value}</div>\n`;
  }

  htmlOutput += "</div>\n";

  return fs.writeFile(htmlFile, htmlOutput, "utf8");
}

function writeReadme(figmaComponents: FigmaComponent[]) {
  // Output the Readme manifest
  const mdFile = path.build("manifest.md");

  let mdOutput = `| Preview | Name | Created | Updated |\n`;
  mdOutput += `| --- | --- | --- | --- |\n`;

  figmaComponents
    .sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    })
    .forEach((c) => {
      mdOutput += `| <img src="${c.thumbnail_url}" style="max-width:100%" /> | ${c.name} | ${c.created_at} | ${c.updated_at} |\n`;
    });

  return fs.writeFile(mdFile, mdOutput, "utf8");
}

function writeManifests() {
  // Output the HTML manifest
  const p1 = concat(
    [
      path.build("icons.html"),
      path.build("spots.html"),
      path.build("cssIcons.html"),
    ],
    path.build("index.html")
  );

  // Output the Readme
  const p2 = concat(
    [path.src("README-template.md"), path.build("manifest.md")],
    path.root("README.md")
  );

  const p3 = concat(
    [
      path.src("js/global.d.ts"),
      path.build("icons.d.ts"),
      path.build("spots.d.ts"),
    ],
    path.build("index.d.ts")
  );

  return Promise.all([p1, p2, p3]);
}

async function buildSvgSetAsync(buildPrefix: OutputType) {
  let { icons, iconsObj } = await processSvgFilesAsync(buildPrefix);

  await Promise.all([
    writeRazor(icons, buildPrefix),
    writeEnums(icons, buildPrefix),
    writeJson(iconsObj, buildPrefix),
    writeJsModule(iconsObj, buildPrefix),
    writeHTML(iconsObj, buildPrefix),
  ]);

  return icons.length;
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
  } catch (error) {
    // do some error reporting
    console.error(error);
  }

  if (bundle) {
    // closes the bundle
    await bundle.close();
  }
}

async function bundleCssIcons() {
  const iconData = cssIcons
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

  // create the preview html file now
  let iconHtml = iconData
    .map((i) => {
      return `<div>
    ${i.name}
    <br/>
    <span class="svg-icon-bg icon${i.name}"></span>
    <span class="svg-icon-bg icon${i.name} native"></span>
    </div>`;
    })
    .join("\n\n");

  iconHtml = `<link rel="stylesheet" href="./icons.css" />
  <h2 style="font-family: arial, sans-serif; font-size: 24px; text-align: center; margin-top: 64px;">CSS Icons Preview</h2>
  <div style="padding: 32px; display:grid; gap:32px; text-align: center; color: #666; font-family: arial, sans-serif; font-size: 12px; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));">
    ${iconHtml}
  </div>`;

  await fs.writeFile(path.build("cssIcons.html"), iconHtml, "utf8"); // TODO
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

  const components = await fetchFromFigma();
  writeReadme(components);

  let iconCount = await buildSvgSetAsync("Icon");
  let spotCount = await buildSvgSetAsync("Spot");

  console.log(`Successfully built ${iconCount} icons and ${spotCount} spots`);

  await bundleHelperJsAsync();
  await bundleCssIcons();

  console.log(`Successfully built helper JS and CSS`);

  await writeManifests();
  console.log(`Successfully built index.html and README.md`);
})().catch((e: Error) => {
  console.error("ERROR: " + e);
  process.exit(1);
});

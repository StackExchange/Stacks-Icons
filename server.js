// @ts-check
import concat from "concat";
import del from "del";
import { promises as fs } from "fs";
import svgToMiniDataURI from "mini-svg-data-uri";
import path from "path";
import { rollup } from "rollup";
import { optimize } from "svgo";
import { fileURLToPath } from "url";
import packageJson from "./package.json" assert { type: "json" };
import cssIcons from "./src/cssIcons.json" assert { type: "json" };
import svgoConfig from "./svgo.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function cleanBuildDirectoryAsync() {
  // Clear the existing SVGs in build/lib
  await del(path.join(__dirname, "/build/**"));
}

async function processSvgFilesAsync(srcPath, destPath, type) {
  // File format
  const ext = ".svg";

  // Read the source directory of SVGs
  let icons = await fs.readdir(srcPath);

  // We only want .svg, ignore the rest
  icons = icons.filter((i) => path.extname(i).toLowerCase() === ext);

  // Remove .svg from name
  icons = icons.map((i) => path.basename(i, ext));

  // Sort alphabetically
  icons = icons.sort();

  // Array of promises which do the fetching of the files
  const readPromises = icons.map((i) =>
    fs.readFile(path.resolve(srcPath, i + ext), "utf8")
  );
  let processed = await Promise.all(readPromises);

  // Optimize them with SVGO
  const optimizePromises = processed.map((i) => optimize(i, svgoConfig));
  const optimized = await Promise.all(optimizePromises);

  // Get the data from the SVGO object
  processed = optimized.map((i) => {
    if (i.error) {
      console.error(i.error);
      return null;
    } else {
      return i.data;
    }
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
  await fs.mkdir(path.join(__dirname, "/build/lib/" + type), {
    recursive: true,
  });

  // Make an object of our icons { IconName: '<svg>' }
  let iconsObj = {};
  processed.forEach((icon, idx) => {
    iconsObj[icons[idx]] = icon;

    // Save each svg
    fs.writeFile(path.resolve(destPath, icons[idx] + ext), icon, "utf8");
  });

  return { icons, iconsObj };
}

function writeRazor(icons, type) {
  // Output the Razor helper
  const csFile = path.join(__dirname, "/build/Helper" + type + "s.cs");
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

function writeEnums(icons, type) {
  // Output enums file
  const enumsFile = path.join(__dirname, "/build/" + type + "s.cs");
  let enumsOutput = "public enum Icons\n{\n";
  enumsOutput += icons.map((i) => `    ${i},`).join("\n");
  enumsOutput += "\n}";

  return fs.writeFile(enumsFile, enumsOutput, "utf8");
}

function writeJson(iconsObj, type) {
  // Output the JSON helper
  const jsonFile = path.join(
    __dirname,
    "/build/" + type.toLowerCase() + "s.json"
  );
  const jsonOutput = JSON.stringify(iconsObj, null, 2);

  return fs.writeFile(jsonFile, jsonOutput, "utf8");
}

function writeJsModule(iconsObj, type) {
  // Output the js helper
  const modFile = path.join(__dirname, "/build/" + type.toLowerCase() + "s.js");

  // output the TypeScript definitions
  const dtsFile = path.join(
    __dirname,
    "/build/" + type.toLowerCase() + "s.d.ts"
  );

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

function writeHTML(iconsObj, type) {
  // Output the HTML manifest
  const htmlFile = path.join(
    __dirname,
    "/build/" + type.toLowerCase() + "s.html"
  );
  let htmlOutput = `<h2 style="font-family: arial, sans-serif; font-size: 24px; text-align: center; margin-top: 64px;">${type}s Preview</h2>\n<div style="padding: 32px; display:grid; gap:32px; text-align: center; color: #666; font-family: arial, sans-serif; font-size: 12px; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));">\n`;

  for (let [key, value] of Object.entries(iconsObj)) {
    htmlOutput += `  <div>${key}<br><br>${value}</div>\n`;
  }

  htmlOutput += "</div>\n";

  return fs.writeFile(htmlFile, htmlOutput, "utf8");
}

function writeIndex() {
  // Output the HTML manifest
  const htmlFile = path.join(__dirname, "/build/index.html");
  const iconsFile = path.join(__dirname, "/build/icons.html");
  const spotsFile = path.join(__dirname, "/build/spots.html");
  const cssIconsFile = path.join(__dirname, "/build/cssIcons.html");

  const inputPathList = [iconsFile, spotsFile, cssIconsFile];

  concat(inputPathList, htmlFile);

  concat(
    [
      path.join(__dirname, "/build/icons.d.ts"),
      path.join(__dirname, "/build/spots.d.ts"),
    ],
    path.join(__dirname, "/build/index.d.ts")
  );
}

async function buildSvgSetAsync(buildPrefix) {
  // Import/export paths
  const srcIconsPath = path.join(__dirname, "/src/" + buildPrefix);
  const destIconsPath = path.join(__dirname, "/build/lib/" + buildPrefix);
  let { icons, iconsObj } = await processSvgFilesAsync(
    srcIconsPath,
    destIconsPath,
    buildPrefix
  );

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

  try {
    // create the browser bundle
    bundle = await rollup({
      input: "./src/js/browser.js",
    });
    await bundle.write({
      file: "./build/index.umd.js",
      format: "umd",
      name: "StacksIcons",
    });

    // create the es6 bundle
    // create the browser bundle
    bundle = await rollup({
      input: "./src/js/index.js",
    });
    await bundle.write({
      file: "./build/index.esm.js",
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
    .map((i) => (typeof i === "string" ? { name: i } : i))
    .sort((a, b) => (a.name > b.name ? 1 : -1));
  const allIconSvgStrings = await Promise.all(
    iconData.map(async (i) =>
      fs.readFile(path.resolve("./src/Icon/", i.name + ".svg"), "utf8")
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
  var cssFile = await fs.readFile(path.resolve("./src/icons.css"), "utf8");
  cssFile += "\n\n" + iconCss;
  await fs.writeFile(path.resolve("./build/icons.css"), cssFile, "utf8");

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

  await fs.writeFile(path.resolve("./build/cssIcons.html"), iconHtml, "utf8");
}

(async () => {
  try {
    await cleanBuildDirectoryAsync();
  } catch (error) {
    console.log(error);
  }

  try {
    let iconCount = await buildSvgSetAsync("Icon");
    let spotCount = await buildSvgSetAsync("Spot");

    console.log(`Successfully built ${iconCount} icons and ${spotCount} spots`);
  } catch (error) {
    console.log(error);
  }

  try {
    await bundleHelperJsAsync();
    await bundleCssIcons();
  } catch (error) {
    console.log(error);
  }

  try {
    await writeIndex();
  } catch (error) {
    console.log(error);
  }
})();

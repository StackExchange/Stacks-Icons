import { program } from "commander";
import { deleteAsync } from "del";
import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import { paths } from "./paths.js";
import { error, info, OutputType, success } from "./utils.js";
import { writeCSharp } from "./write-csharp.js";
import { bundleCssIcons } from "./write-css.js";
import { bundleHelperJsAsync, writeJsModule, writeJson } from "./write-js.js";
import { writeManifests } from "./write-manifests.js";
import { fetchFromFigma, processSvgFilesAsync } from "./write-svg.js";

// load environmental variables from the .env file
dotenv.config();

// check cli options
program
  .usage("[OPTIONS]...")
  .option("-c, --cached", "Use already downloaded images if they exist")
  .parse(process.argv);

const options = program.opts<{ cached: boolean }>();

async function cleanBuildDirectoryAsync() {
  // Clear the existing built files
  await deleteAsync(paths.build());
  await deleteAsync(paths.preview());

  // Clear the downloads from Figma
  if (!options.cached) {
    await deleteAsync(paths.src("Icon"));
    await deleteAsync(paths.src("Spot"));
  }

  // Recreate the empty build folders
  await fs.mkdir(paths.build());
  await fs.mkdir(paths.preview());
}

async function buildSvgSetAsync(buildPrefix: OutputType) {
  let { icons, iconsObj } = await processSvgFilesAsync(buildPrefix);

  await Promise.all([
    writeCSharp(icons, buildPrefix),
    writeJson(iconsObj, buildPrefix),
    writeJsModule(iconsObj, buildPrefix),
  ]);

  return { obj: iconsObj, count: icons.length };
}

(async () => {
  if (!process.env["FIGMA_ACCESS_TOKEN"]) {
    throw `Unable to fetch icons from Figma without an access token;
Set "FIGMA_ACCESS_TOKEN" via an environment variable or with a .env file`;
  }

  await cleanBuildDirectoryAsync();

  // ensure the download directory is created
  await fs.mkdir(paths.src("Icon"), { recursive: true });
  await fs.mkdir(paths.src("Spot"), { recursive: true });

  const hasCachedIcons =
    (await fs.stat(paths.src("Icon")))?.isDirectory() || false;
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

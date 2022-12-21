import { promises as fs } from "fs";
import { basename } from "path";
import { optimize } from "svgo";
import { paths } from "./paths.js";
import { error, OutputType } from "./utils.js";

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
  await fs.mkdir(paths.build("lib", type), {
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
      paths.build(paths.build("lib", type), icons[idx] + ext),
      svgStr,
      "utf8"
    );
  });

  return { icons, iconsObj };
}

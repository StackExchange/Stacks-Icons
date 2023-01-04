import { promises as fs } from "fs";
import { paths } from "./paths.js";
import type { OutputType } from "./utils.js";

export function writeCSharp(icons: string[], type: OutputType) {
  // Output the Razor helper
  const csFile = paths.build(type + "s.g.cs");
  const isSpot = type === "Spot";
  let iconsOutput = icons
    .map((i) => `    public static SvgImage ${i} { get; } = GetImage();`)
    .join("\n");

  // add in the lookup dictionary
  iconsOutput += `
    public static readonly ImmutableDictionary<Stacks${type}, SvgImage> Lookup = new Dictionary<Stacks${type}, SvgImage>
    {
${icons
  .map(
    (i) => `        [Stacks${type}.${i}] = Svg${isSpot ? ".Spot" : ""}.${i},`
  )
  .join("\n")}
    }.ToImmutableDictionary();
`;

  let csOutput = `public static partial class ${isSpot ? "Spot" : "Svg"}
{
${iconsOutput}
}`;

  // wrap the spots in the SVG class and indent each line (so it looks pretty <3)
  if (isSpot) {
    csOutput = `public static partial class Svg
{
    ${csOutput.replace(/\n/g, "\n    ")}
}`;
  }

  // add in the enums
  csOutput += `
public enum Stacks${type}
{
${icons.map((i) => `    ${i},`).join("\n")}
}`;

  // add in the namespace and usings at the top
  csOutput = `using System.Collections.Generic;
using System.Collections.Immutable;
namespace StackExchange.StacksIcons;
${csOutput}`;

  return fs.writeFile(csFile, csOutput, "utf8");
}

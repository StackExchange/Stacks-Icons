import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import packageJson from "../package.json" with { type: "json" };

const project = readFileSync(
    new URL("../dotnet/src/StackExchange.StacksIcons.csproj", import.meta.url),
    "utf8"
);

/** @param {string} name */
function readElement(name) {
    const match = project.match(new RegExp(`<${name}>([^<]+)</${name}>`));
    assert.ok(match, `Missing <${name}> from the NuGet project`);
    return match[1];
}

assert.match(
    packageJson.version,
    /^6\./,
    "V6 packages must remain on major version 6"
);
assert.equal(
    readElement("Version"),
    packageJson.version,
    "npm and NuGet versions must match"
);
assert.equal(packageJson.license, "MIT");
assert.equal(
    readElement("PackageLicenseExpression"),
    packageJson.license,
    "npm and NuGet licenses must match"
);
assert.equal(readElement("TargetFrameworks"), "net6.0;net8.0");

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

assert.equal(
    readElement("Version"),
    packageJson.version,
    "npm and NuGet versions must match"
);
assert.equal(packageJson.license, "Apache-2.0");
assert.equal(
    readElement("PackageLicenseExpression"),
    packageJson.license,
    "npm and NuGet licenses must match"
);
assert.equal(readElement("TargetFramework"), "net8.0");
assert.match(
    project,
    /<PackageReference Include="System\.Collections\.Immutable" Version="9\.[^"]*" \/>/,
    "System.Collections.Immutable must use the current .NET 9-compatible package line"
);

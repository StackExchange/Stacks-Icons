import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { env } from "node:process";
import packageJson from "../package.json" with { type: "json" };

assert.equal(env["GITHUB_REF_TYPE"], "tag", "Releases must run from a Git tag");
assert.equal(
    env["GITHUB_REF_NAME"],
    `v${packageJson.version}`,
    "The Git tag must match the package version"
);

const prerelease = packageJson.version.split("-", 2)[1];
const npmTag = prerelease?.split(".", 1)[0] ?? "latest";

assert.match(
    npmTag,
    /^(?:latest|[a-z][a-z0-9-]*)$/i,
    "The npm dist-tag must start with a letter"
);

const githubOutput = env["GITHUB_OUTPUT"];
assert.ok(githubOutput, "GITHUB_OUTPUT is unavailable");
appendFileSync(githubOutput, `npm-tag=${npmTag}\n`);

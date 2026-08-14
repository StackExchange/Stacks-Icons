import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { env } from "node:process";
import packageJson from "../package.json" with { type: "json" };
import { getNpmTag } from "./release-policy.mjs";

const npmTag = getNpmTag({
    refType: env["GITHUB_REF_TYPE"],
    refName: env["GITHUB_REF_NAME"],
    version: packageJson.version,
});

const githubOutput = env["GITHUB_OUTPUT"];
assert.ok(githubOutput, "GITHUB_OUTPUT is unavailable");
appendFileSync(githubOutput, `npm-tag=${npmTag}\n`);

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { env, execPath } from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import packageJson from "../package.json" with { type: "json" };

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectory = mkdtempSync(resolve(tmpdir(), "stacks-icons-"));
const consumerDirectory = resolve(temporaryDirectory, "consumer");

/** @typedef {Omit<import("node:child_process").ExecFileSyncOptionsWithStringEncoding, "encoding">} RunOptions */

/**
 * @param {string} command
 * @param {string[]} args
 * @param {RunOptions} [options]
 */
function run(command, args, options = {}) {
    return execFileSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
        ...options,
    });
}

/**
 * @param {string[]} args
 * @param {RunOptions} [options]
 */
function runNpm(args, options = {}) {
    const npmExecPath = env["npm_execpath"];
    assert.ok(npmExecPath, "Run this test through npm run test:package");
    return run(execPath, [npmExecPath, ...args], options);
}

try {
    const config = YAML.parse(
        readFileSync(resolve(repositoryRoot, "config.yaml"), "utf8")
    );
    const cssIconNames = Object.keys(config.cssIcons ?? {});
    const generatedCss = readFileSync(
        resolve(repositoryRoot, "dist/icons.css"),
        "utf8"
    );

    assert.ok(cssIconNames.length > 0, "No CSS icons are configured");
    for (const iconName of cssIconNames) {
        assert.match(
            generatedCss,
            new RegExp(`\\.svg-icon-bg\\.icon${iconName}\\s*\\{`),
            `Missing generated CSS selector for ${iconName}`
        );
    }
    const generatedCssIconNames = [
        ...generatedCss.matchAll(/\.svg-icon-bg\.icon([A-Za-z0-9]+)\s*\{/g),
    ].map((match) => match[1]);
    assert.deepEqual(
        generatedCssIconNames.sort(),
        cssIconNames.sort(),
        "Generated CSS selectors must match the configured CSS icons"
    );

    /** @type {{ filename: string, files: { path: string }[] }} */
    const packResult = JSON.parse(
        runNpm(
            [
                "pack",
                "--ignore-scripts",
                "--json",
                "--pack-destination",
                temporaryDirectory,
            ],
            { cwd: repositoryRoot }
        )
    )[0];
    const packagedFiles = new Set(packResult.files.map(({ path }) => path));

    for (const expectedFile of [
        "dist/index.umd.cjs",
        "dist/index.esm.js",
        "dist/index.d.ts",
        "dist/icons.js",
        "dist/spots.js",
        "dist/icons.css",
        "dist/manifest.json",
        "package.json",
        "README.md",
        "LICENSE.md",
    ]) {
        assert.ok(
            packagedFiles.has(expectedFile),
            `Missing ${expectedFile} from package`
        );
    }

    mkdirSync(consumerDirectory);
    writeFileSync(
        resolve(consumerDirectory, "package.json"),
        JSON.stringify({
            name: "stacks-icons-consumer",
            private: true,
            type: "module",
        })
    );

    const tarballPath = resolve(temporaryDirectory, packResult.filename);
    runNpm(
        [
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--no-package-lock",
            tarballPath,
        ],
        { cwd: consumerDirectory }
    );

    writeFileSync(
        resolve(consumerDirectory, "consumer.cjs"),
        `const assert = require("node:assert/strict");
const { Icons, Spots } = require("@stackoverflow/stacks-icons");

assert.equal(typeof Icons.IconArchive, "string");
assert.equal(typeof Spots.SpotAds, "string");
`
    );
    run(execPath, ["consumer.cjs"], { cwd: consumerDirectory });

    writeFileSync(
        resolve(consumerDirectory, "consumer.mjs"),
        `import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as root from "@stackoverflow/stacks-icons";
import * as icons from "@stackoverflow/stacks-icons/icons";
import * as spots from "@stackoverflow/stacks-icons/spots";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const manifestPath = require.resolve("@stackoverflow/stacks-icons/manifest");
const cssPath = require.resolve("@stackoverflow/stacks-icons/dist/icons.css");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

assert.equal(manifest.version, ${JSON.stringify(packageJson.version)});
assert.ok(manifest.icons.length > 0);
assert.ok(manifest.spots.length > 0);
assert.equal(typeof root.IconArchive, "string");
assert.equal(root.IconArchive, icons.IconArchive);
assert.equal(typeof spots.SpotAds, "string");
assert.ok(readFileSync(cssPath, "utf8").includes(".svg-icon-bg"));

for (const entry of [...manifest.icons, ...manifest.spots]) {
    const exports = entry.isSpot ? spots : icons;
    for (const variant of entry.variants) {
        const exportName = (entry.isSpot ? "Spot" : "Icon") + variant.key;
        assert.equal(typeof exports[exportName], "string", "Missing JS export: " + exportName);
        const type = entry.isSpot ? "Spot" : "Icon";
        assert.ok(require.resolve("@stackoverflow/stacks-icons/src/" + type + "/" + variant.key + ".svg"));
        assert.ok(require.resolve("@stackoverflow/stacks-icons/dist/" + type + "/" + variant.key + ".svg"));
    }
}

const expectedIconExports = manifest.icons.flatMap((entry) =>
    entry.variants.map((variant) => "Icon" + variant.key)
);
const expectedSpotExports = manifest.spots.flatMap((entry) =>
    entry.variants.map((variant) => "Spot" + variant.key)
);
assert.deepEqual(Object.keys(icons).sort(), expectedIconExports.sort());
assert.deepEqual(Object.keys(spots).sort(), expectedSpotExports.sort());
`
    );
    run(execPath, ["consumer.mjs"], { cwd: consumerDirectory });

    writeFileSync(
        resolve(consumerDirectory, "consumer.ts"),
        `import { IconArchive } from "@stackoverflow/stacks-icons/icons";
import { SpotAds } from "@stackoverflow/stacks-icons/spots";

const icon: string = IconArchive;
const spot: string = SpotAds;
void [icon, spot];
`
    );
    writeFileSync(
        resolve(consumerDirectory, "tsconfig.json"),
        JSON.stringify({
            compilerOptions: {
                module: "NodeNext",
                moduleResolution: "NodeNext",
                noEmit: true,
                strict: true,
                target: "ES2022",
            },
            include: ["consumer.ts"],
        })
    );

    const typescriptBin = resolve(
        repositoryRoot,
        "node_modules/typescript/bin/tsc"
    );
    run(execPath, [typescriptBin, "--project", "tsconfig.json"], {
        cwd: consumerDirectory,
    });
} finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
}

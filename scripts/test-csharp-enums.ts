import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import releasedIconValues from "../dotnet/icon-enum-values.json" with { type: "json" };
import { flattenDefinitions, type Definitions } from "./build/utils.js";

const outputDirectory = await mkdtemp(join(tmpdir(), "stacks-icons-enums-"));
process.env["ASSET_OUTPUT_DIR"] = outputDirectory;
const { writeCSharp } = await import("./build/write-csharp.js");

async function readGeneratedIconValues() {
    const source = await readFile(join(outputDirectory, "Icons.g.cs"), "utf8");
    const members: Record<string, number> = {};
    for (const [, name, value] of source.matchAll(/^ {4}(\w+) = (\d+),$/gm)) {
        assert.ok(name);
        members[name] = Number(value);
    }
    return members;
}

try {
    await test("custom icon sets preserve released numbers and include only their own members", async () => {
        await writeCSharp(
            ["AardvarkCustom", "Alert", "ServiceMoveworks", "Settings"],
            "Icon"
        );
        const members = await readGeneratedIconValues();
        const { AardvarkCustom: customValue, ...knownValues } = members;
        assert.deepEqual(knownValues, {
            Alert: 0,
            ServiceMoveworks: 406,
            Settings: 431,
        });
        assert.ok(typeof customValue === "number");
        assert.ok(customValue > Math.max(...Object.values(releasedIconValues)));
    });

    await test("generated enum preserves every published 7.1.0 icon value", async () => {
        await writeCSharp(Object.keys(releasedIconValues).sort(), "Icon");
        const generatedValues = await readGeneratedIconValues();
        const baseline = Object.entries(generatedValues)
            .filter(([, value]) => value < 547)
            .sort((a, b) => a[1] - b[1]);
        assert.equal(baseline.length, 547);
        // SHA-256 of Name=Number lines from the published 7.1.0 NuGet assembly.
        const snapshot = baseline
            .map(([name, value]) => `${name}=${value}`)
            .join("\n");
        assert.equal(
            createHash("sha256").update(snapshot).digest("hex"),
            "61cb74a3b656f1db68a38793feb04cdbffb24eb799e11117769a6a847088311f"
        );
    });

    await test("published icon definitions have unique permanent enum values", async () => {
        const config = parse(
            await readFile(new URL("../config.yaml", import.meta.url), "utf8")
        ) as { definitions: Definitions };
        const names = new Set(
            Object.keys(flattenDefinitions(config.definitions))
                .filter((name) => name.startsWith("Icon/"))
                .map((name) => name.slice("Icon/".length))
        );
        assert.deepEqual(new Set(Object.keys(releasedIconValues)), names);
        const values = Object.values(releasedIconValues);
        assert.equal(new Set(values).size, values.length);
        assert.ok(
            values.every((value) => Number.isInteger(value) && value >= 0)
        );
    });
} finally {
    await rm(outputDirectory, { force: true, recursive: true });
}

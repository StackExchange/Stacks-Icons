import assert from "node:assert/strict";
import { test } from "node:test";
import { flattenFigmaComponentVariantName } from "./build/utils.js";

await test("maps Monday.com variants to the public MondayCom names", () => {
    assert.deepEqual(
        [
            "Service=Monday.com, Size=Default",
            "Service=Monday.com, Size=32",
            "Service=Monday.com, Size=64",
        ].map(flattenFigmaComponentVariantName),
        ["MondayCom", "MondayCom32", "MondayCom64"]
    );
});

await test("preserves existing variant naming conventions", () => {
    assert.deepEqual(
        [
            "Service=GoogleDocs, Size=32",
            "Service=Slack DMs, Size=Default",
            "Service=Sharepoint, Size=64",
            "Size=Default, Stack=True, Style=Fill",
            "Size=16, Stack=False, Style=Default",
            "Size=Default, Style=Default",
        ].map(flattenFigmaComponentVariantName),
        ["GoogleDocs32", "SlackDMs", "Sharepoint64", "StackFill", "16", ""]
    );
});
